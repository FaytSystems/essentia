const EASYSHIP_API_BASE = "https://public-api.easyship.com/2024-09";
const PRODUCT_PRICE_CENTS = 16900;
const REQUIRED_STATE_COUNTRIES = new Set(["AU", "CA", "CN", "ID", "MX", "MY", "TH", "US", "VN"]);

function sendJson(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function cleanString(value) {
  return String(value || "").trim();
}

function getErrorMessage(value, fallback) {
  if (!value) {
    return fallback;
  }

  if (typeof value === "string") {
    return value;
  }

  if (value.message && value.message !== value) {
    return getErrorMessage(value.message, fallback);
  }

  if (value.error && value.error !== value) {
    return getErrorMessage(value.error, fallback);
  }

  if (Array.isArray(value.errors) && value.errors.length) {
    return value.errors.map((item) => getErrorMessage(item, "")).filter(Boolean).join(" ");
  }

  if (Array.isArray(value) && value.length) {
    return value.map((item) => getErrorMessage(item, "")).filter(Boolean).join(" ");
  }

  if (typeof value === "object") {
    const parts = Object.entries(value).map(([key, item]) => {
      const message = getErrorMessage(item, "");
      return message ? `${key}: ${message}` : "";
    }).filter(Boolean);

    if (parts.length) {
      return parts.join(" ");
    }

    try {
      const json = JSON.stringify(value);
      return json && json !== "{}" ? json : fallback;
    } catch (error) {
      return fallback;
    }
  }

  return fallback;
}

function clampQuantity(value) {
  const quantity = Number(value || 1);
  if (!Number.isFinite(quantity)) {
    return 1;
  }
  return Math.max(1, Math.min(4, Math.round(quantity)));
}

function getParcelProfile(quantity) {
  if (quantity === 1) {
    return { length: 15.2, width: 15.2, height: 10.2, weight: 0.5 };
  }

  if (quantity === 2) {
    return { length: 25.4, width: 15.2, height: 10.2, weight: 0.9 };
  }

  return { length: 25.4, width: 20.3, height: 15.2, weight: 1.7 };
}

function requireOriginValue(value, name) {
  const cleaned = cleanString(value);
  if (!cleaned) {
    throw new Error(`Easyship origin ${name} is not configured.`);
  }
  return cleaned;
}

function getOriginCountry(env) {
  const country = cleanString(env.EASYSHIP_ORIGIN_COUNTRY || "US").toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) {
    throw new Error("Easyship origin country must be a 2-letter country code like US.");
  }
  return country;
}

function getOriginAddress(env) {
  return {
    line_1: requireOriginValue(env.EASYSHIP_ORIGIN_LINE1, "street address"),
    line_2: cleanString(env.EASYSHIP_ORIGIN_LINE2) || null,
    city: requireOriginValue(env.EASYSHIP_ORIGIN_CITY, "city"),
    state: requireOriginValue(env.EASYSHIP_ORIGIN_STATE, "state"),
    postal_code: requireOriginValue(env.EASYSHIP_ORIGIN_POSTAL_CODE, "postal code"),
    country_alpha2: getOriginCountry(env)
  };
}

function getEasyshipRatesUrl(env) {
  let baseUrl = cleanString(env.EASYSHIP_API_BASE) || EASYSHIP_API_BASE;
  baseUrl = baseUrl.replace(/\/+$/, "").replace(/\/rates$/i, "");

  if (!/\/2024-09$/i.test(baseUrl)) {
    baseUrl = baseUrl.replace(/\/20\d{2}-\d{2}$/i, "");
    baseUrl += "/2024-09";
  }

  return `${baseUrl}/rates`;
}

function validatePayload(payload) {
  const quantity = clampQuantity(payload.quantity);
  const customer = payload.customer || {};
  const address = payload.address || {};
  const country = cleanString(address.country).toUpperCase();
  const incoterms = cleanString(payload.incoterms || "DDU").toUpperCase();
  const selectedRateId = cleanString(payload.selectedRateId);

  if (!selectedRateId) {
    throw new Error("Choose a shipping rate before checkout.");
  }

  if (!cleanString(customer.email) || !cleanString(customer.name)) {
    throw new Error("Name and email are required.");
  }

  if (!cleanString(address.line1) || !cleanString(address.city) || !cleanString(address.postalCode) || country.length !== 2) {
    throw new Error("Complete shipping address and 2-letter country code are required.");
  }

  if (REQUIRED_STATE_COUNTRIES.has(country) && !cleanString(address.state)) {
    throw new Error("State/province is required for this destination country.");
  }

  if (!["DDU", "DDP"].includes(incoterms)) {
    throw new Error("Incoterms must be DDU or DDP.");
  }

  return {
    quantity,
    incoterms,
    selectedRateId,
    customer: {
      name: cleanString(customer.name),
      email: cleanString(customer.email)
    },
    address: {
      line1: cleanString(address.line1),
      line2: cleanString(address.line2),
      city: cleanString(address.city),
      state: cleanString(address.state),
      postalCode: cleanString(address.postalCode),
      country
    }
  };
}

function buildEasyshipBody(payload, env) {
  const profile = getParcelProfile(payload.quantity);

  return {
    origin_address: getOriginAddress(env),
    destination_address: {
      line_1: payload.address.line1,
      line_2: payload.address.line2 || null,
      city: payload.address.city,
      state: payload.address.state || null,
      postal_code: payload.address.postalCode,
      country_alpha2: payload.address.country
    },
    incoterms: payload.incoterms,
    calculate_tax_and_duties: true,
    shipping_settings: {
      units: {
        weight: "kg",
        dimensions: "cm"
      },
      output_currency: "USD"
    },
    parcels: [
      {
        total_actual_weight: profile.weight,
        box: {
          length: profile.length,
          width: profile.width,
          height: profile.height
        },
        items: [
          {
            description: "Smart humidity regulating jar cap",
            hs_code: "903289",
            sku: "ESSENTIA-CAP-001",
            contains_battery_pi967: true,
            contains_liquids: false,
            quantity: payload.quantity,
            actual_weight: 0.38,
            declared_currency: "USD",
            declared_customs_value: PRODUCT_PRICE_CENTS / 100,
            origin_country_alpha2: "US"
          }
        ]
      }
    ]
  };
}

function normalizeRates(rates, env) {
  const handlingCents = Number(env.SHIPPING_HANDLING_CENTS || 0);

  return (Array.isArray(rates) ? rates : []).map((rate) => {
    const service = rate.courier_service || {};
    const id = service.id || service.courier_id || rate.courier_id;
    const courierName = service.name || service.umbrella_name || rate.courier_name || "Courier";
    const currency = String(rate.currency || "USD").toUpperCase();
    const baseChargeCents = Math.round(Number(rate.total_charge || 0) * 100);
    const totalChargeCents = baseChargeCents + (Number.isFinite(handlingCents) ? handlingCents : 0);

    return {
      id,
      courierName,
      serviceName: rate.description || rate.full_description || courierName,
      fullDescription: rate.full_description || "",
      incoterms: rate.incoterms || null,
      currency,
      totalChargeCents
    };
  }).filter((rate) => rate.id && rate.totalChargeCents > 0);
}

async function requestRates(payload, env) {
  if (!env.EASYSHIP_API_TOKEN) {
    throw new Error("Easyship API token is not configured.");
  }

  const response = await fetch(getEasyshipRatesUrl(env), {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.EASYSHIP_API_TOKEN}`,
      "Accept": "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(buildEasyshipBody(payload, env))
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = getErrorMessage(data, "Easyship could not return rates for that address.");
    throw new Error(message);
  }

  return normalizeRates(data.rates, env);
}

function getBaseUrl(request, env) {
  if (env.SITE_URL) {
    return env.SITE_URL.replace(/\/$/, "");
  }

  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

async function createStripeCheckoutSession(request, env, payload, selectedRate) {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe secret key is not configured.");
  }

  if (selectedRate.currency !== "USD") {
    throw new Error("Selected Easyship rate must be in USD for this checkout.");
  }

  const baseUrl = getBaseUrl(request, env);
  const params = new URLSearchParams();

  params.set("mode", "payment");
  params.set("success_url", `${baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`);
  params.set("cancel_url", `${baseUrl}/preorder.html?checkout=cancelled`);
  params.set("customer_email", payload.customer.email);
  params.set("billing_address_collection", "auto");
  params.set("shipping_address_collection[allowed_countries][0]", payload.address.country);
  params.set("phone_number_collection[enabled]", "true");
  params.set("line_items[0][quantity]", String(payload.quantity));
  params.set("line_items[0][price_data][currency]", "usd");
  params.set("line_items[0][price_data][unit_amount]", String(PRODUCT_PRICE_CENTS));
  params.set("line_items[0][price_data][product_data][name]", "Essentia Founder Edition Pre-order");
  params.set("line_items[0][price_data][product_data][description]", "Smart humidity-regulating mason jar cap from the first 1,100-unit Founder Edition batch.");
  params.set("shipping_options[0][shipping_rate_data][type]", "fixed_amount");
  params.set("shipping_options[0][shipping_rate_data][fixed_amount][amount]", String(selectedRate.totalChargeCents));
  params.set("shipping_options[0][shipping_rate_data][fixed_amount][currency]", "usd");
  params.set("shipping_options[0][shipping_rate_data][display_name]", selectedRate.courierName);
  params.set("shipping_options[0][shipping_rate_data][delivery_estimate][minimum][unit]", "business_day");
  params.set("shipping_options[0][shipping_rate_data][delivery_estimate][minimum][value]", "3");
  params.set("shipping_options[0][shipping_rate_data][delivery_estimate][maximum][unit]", "business_day");
  params.set("shipping_options[0][shipping_rate_data][delivery_estimate][maximum][value]", "21");
  params.set("metadata[order_type]", "founder_preorder");
  params.set("metadata[founder_edition]", "first_1100_specialty_packaging_numbered_certificate");
  params.set("metadata[quantity]", String(payload.quantity));
  params.set("metadata[customer_name]", payload.customer.name.slice(0, 450));
  params.set("metadata[easyship_courier_id]", selectedRate.id);
  params.set("metadata[easyship_courier_name]", selectedRate.courierName.slice(0, 450));
  params.set("metadata[incoterms]", payload.incoterms);
  params.set("metadata[shipping_country]", payload.address.country);
  params.set("metadata[shipping_postal_code]", payload.address.postalCode);
  params.set("metadata[shipping_address_json]", JSON.stringify(payload.address).slice(0, 450));

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString()
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = getErrorMessage(data, "Stripe could not create checkout.");
    throw new Error(message);
  }

  return data;
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const payload = validatePayload(body);
    const rates = await requestRates(payload, env);
    const selectedRate = rates.find((rate) => rate.id === payload.selectedRateId);

    if (!selectedRate) {
      throw new Error("Selected Easyship rate is no longer available. Please recalculate shipping.");
    }

    const session = await createStripeCheckoutSession(request, env, payload, selectedRate);
    return sendJson({ url: session.url });
  } catch (error) {
    return sendJson({ error: getErrorMessage(error, "Could not create checkout session.") }, 400);
  }
}

export async function onRequest() {
  return sendJson({ error: "Method not allowed." }, 405);
}
