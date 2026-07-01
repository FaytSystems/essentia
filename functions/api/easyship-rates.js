const EASYSHIP_API_BASE = "https://public-api.easyship.com/2024-09";
const PRODUCT_PRICE_CENTS = 16900;

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

function getOriginAddress(env) {
  return {
    line_1: env.EASYSHIP_ORIGIN_LINE1,
    line_2: env.EASYSHIP_ORIGIN_LINE2 || undefined,
    city: env.EASYSHIP_ORIGIN_CITY,
    state: env.EASYSHIP_ORIGIN_STATE,
    postal_code: env.EASYSHIP_ORIGIN_POSTAL_CODE,
    country_alpha2: env.EASYSHIP_ORIGIN_COUNTRY || "US"
  };
}

function validatePayload(payload) {
  const quantity = clampQuantity(payload.quantity);
  const customer = payload.customer || {};
  const address = payload.address || {};
  const country = cleanString(address.country).toUpperCase();
  const incoterms = cleanString(payload.incoterms || "DDU").toUpperCase();

  if (!cleanString(customer.email) || !cleanString(customer.name)) {
    throw new Error("Name and email are required.");
  }

  if (!cleanString(address.line1) || !cleanString(address.city) || !cleanString(address.postalCode) || country.length !== 2) {
    throw new Error("Complete shipping address and 2-letter country code are required.");
  }

  if (!["DDU", "DDP"].includes(incoterms)) {
    throw new Error("Incoterms must be DDU or DDP.");
  }

  return {
    quantity,
    incoterms,
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
      line_2: payload.address.line2 || undefined,
      city: payload.address.city,
      state: payload.address.state || undefined,
      postal_code: payload.address.postalCode,
      country_alpha2: payload.address.country
    },
    incoterms: payload.incoterms,
    calculate_tax_and_duties: true,
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
            category: "electronics",
            sku: "ESSENTIA-CAP-001",
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
    const currency = String(rate.currency || "USD").toUpperCase();
    const baseChargeCents = Math.round(Number(rate.total_charge || 0) * 100);
    const totalChargeCents = baseChargeCents + (Number.isFinite(handlingCents) ? handlingCents : 0);
    const min = rate.min_delivery_time;
    const max = rate.max_delivery_time;

    return {
      id: rate.courier_id,
      courierName: rate.courier_name || "Courier",
      serviceName: rate.description || rate.full_description || "Shipping",
      fullDescription: rate.full_description || "",
      incoterms: rate.incoterms || null,
      currency,
      totalChargeCents,
      deliveryWindow: min && max ? `${min}-${max} business days` : "",
      minDeliveryTime: min || null,
      maxDeliveryTime: max || null,
      rank: rate.value_for_money_rank || rate.cost_rank || 99
    };
  }).filter((rate) => rate.id && rate.totalChargeCents > 0);
}

async function requestRates(payload, env) {
  if (!env.EASYSHIP_API_TOKEN) {
    throw new Error("Easyship API token is not configured.");
  }

  const response = await fetch(`${env.EASYSHIP_API_BASE || EASYSHIP_API_BASE}/rates`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.EASYSHIP_API_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(buildEasyshipBody(payload, env))
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = getErrorMessage(data, "Easyship could not return rates for that address.");
    throw new Error(message);
  }

  return normalizeRates(data.rates, env).sort((a, b) => a.totalChargeCents - b.totalChargeCents);
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const payload = validatePayload(body);
    const rates = await requestRates(payload, env);
    return sendJson({ rates });
  } catch (error) {
    return sendJson({ error: getErrorMessage(error, "Could not calculate shipping.") }, 400);
  }
}

export async function onRequest() {
  return sendJson({ error: "Method not allowed." }, 405);
}
