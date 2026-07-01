const EASYSHIP_API_BASE = "https://public-api.easyship.com/2024-09";
const PRODUCT_PRICE_CENTS = 16900;
const MAX_COUNTRIES_PER_RUN = 25;
const REQUIRED_STATE_COUNTRIES = new Set(["AU", "CA", "CN", "ID", "MX", "MY", "TH", "US", "VN"]);

const SAMPLE_ADDRESSES = {
  US: { line1: "1600 Pennsylvania Ave NW", city: "Washington", state: "DC", postalCode: "20500" },
  CA: { line1: "111 Wellington St", city: "Ottawa", state: "ON", postalCode: "K1A 0A4" },
  GB: { line1: "10 Downing Street", city: "London", state: "", postalCode: "SW1A 2AA" },
  AU: { line1: "1 Macquarie Street", city: "Sydney", state: "NSW", postalCode: "2000" },
  NZ: { line1: "1 Molesworth Street", city: "Wellington", state: "", postalCode: "6011" },
  DE: { line1: "Platz der Republik 1", city: "Berlin", state: "", postalCode: "11011" },
  FR: { line1: "55 Rue du Faubourg Saint-Honore", city: "Paris", state: "", postalCode: "75008" },
  IT: { line1: "Piazza del Colosseo 1", city: "Rome", state: "", postalCode: "00184" },
  ES: { line1: "Plaza de la Puerta del Sol 1", city: "Madrid", state: "", postalCode: "28013" },
  NL: { line1: "Binnenhof 1", city: "The Hague", state: "", postalCode: "2513 AA" },
  BE: { line1: "Rue de la Loi 16", city: "Brussels", state: "", postalCode: "1000" },
  CH: { line1: "Bundesplatz 3", city: "Bern", state: "", postalCode: "3003" },
  AT: { line1: "Ballhausplatz 2", city: "Vienna", state: "", postalCode: "1010" },
  IE: { line1: "Merrion Street Upper", city: "Dublin", state: "", postalCode: "D02 R583" },
  SE: { line1: "Riksgatan 1", city: "Stockholm", state: "", postalCode: "100 12" },
  NO: { line1: "Karl Johans gate 22", city: "Oslo", state: "", postalCode: "0026" },
  DK: { line1: "Christiansborg Slotsplads 1", city: "Copenhagen", state: "", postalCode: "1218" },
  FI: { line1: "Mannerheimintie 30", city: "Helsinki", state: "", postalCode: "00100" },
  PL: { line1: "Plac Zamkowy 4", city: "Warsaw", state: "", postalCode: "00-277" },
  PT: { line1: "Praca do Comercio", city: "Lisbon", state: "", postalCode: "1100-148" },
  GR: { line1: "Syntagma Square", city: "Athens", state: "", postalCode: "105 63" },
  JP: { line1: "1-1 Chiyoda", city: "Tokyo", state: "Tokyo", postalCode: "100-8111" },
  KR: { line1: "1 Sejong-daero", city: "Seoul", state: "", postalCode: "04524" },
  SG: { line1: "1 Parliament Place", city: "Singapore", state: "", postalCode: "178880" },
  HK: { line1: "1 Legislative Council Road", city: "Central", state: "", postalCode: "999077" },
  TW: { line1: "No. 1 Chongqing S Rd", city: "Taipei", state: "", postalCode: "100" },
  MY: { line1: "Jalan Parlimen", city: "Kuala Lumpur", state: "Kuala Lumpur", postalCode: "50680" },
  TH: { line1: "1 Nakhon Pathom Road", city: "Bangkok", state: "Bangkok", postalCode: "10300" },
  PH: { line1: "Padre Burgos Ave", city: "Manila", state: "", postalCode: "1000" },
  ID: { line1: "Jl. Medan Merdeka Utara", city: "Jakarta", state: "DKI Jakarta", postalCode: "10110" },
  VN: { line1: "2 Hung Vuong", city: "Hanoi", state: "Hanoi", postalCode: "100000" },
  IN: { line1: "Sansad Marg", city: "New Delhi", state: "DL", postalCode: "110001" },
  AE: { line1: "Sheikh Zayed Road", city: "Dubai", state: "Dubai", postalCode: "00000" },
  SA: { line1: "King Fahd Road", city: "Riyadh", state: "", postalCode: "12271" },
  IL: { line1: "1 Kaplan Street", city: "Jerusalem", state: "", postalCode: "9195015" },
  ZA: { line1: "120 Plein Street", city: "Cape Town", state: "WC", postalCode: "8001" },
  MX: { line1: "Plaza de la Constitucion", city: "Mexico City", state: "CDMX", postalCode: "06000" },
  BR: { line1: "Praca dos Tres Poderes", city: "Brasilia", state: "DF", postalCode: "70150-900" },
  AR: { line1: "Balcarce 50", city: "Buenos Aires", state: "CABA", postalCode: "C1064" },
  CL: { line1: "Moneda S/N", city: "Santiago", state: "RM", postalCode: "8320000" },
  CO: { line1: "Carrera 7 #6-54", city: "Bogota", state: "", postalCode: "111711" },
  PE: { line1: "Jiron de la Union 300", city: "Lima", state: "", postalCode: "15001" }
};

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

function getDestinationAddress(country) {
  const sample = SAMPLE_ADDRESSES[country] || {
    line1: "1 Main Street",
    city: "Capital City",
    state: "",
    postalCode: "00000"
  };

  return {
    line_1: sample.line1,
    city: sample.city,
    state: sample.state || null,
    postal_code: sample.postalCode,
    country_alpha2: country
  };
}

function buildEasyshipBody(country, quantity, incoterms, env) {
  const profile = getParcelProfile(quantity);

  return {
    origin_address: getOriginAddress(env),
    destination_address: getDestinationAddress(country),
    incoterms,
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
            quantity,
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

function normalizeCountries(value) {
  const raw = Array.isArray(value) ? value : String(value || "").split(/[\s,]+/);
  const countries = raw.map((country) => cleanString(country).toUpperCase()).filter((country) => /^[A-Z]{2}$/.test(country));
  return [...new Set(countries)].slice(0, MAX_COUNTRIES_PER_RUN);
}

async function testCountry(country, quantity, incoterms, env) {
  const response = await fetch(getEasyshipRatesUrl(env), {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.EASYSHIP_API_TOKEN}`,
      "Accept": "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(buildEasyshipBody(country, quantity, incoterms, env))
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      country,
      ok: false,
      rateCount: 0,
      error: getErrorMessage(data, `Easyship returned ${response.status}`)
    };
  }

  const rates = Array.isArray(data.rates) ? data.rates : [];
  const cheapest = rates
    .map((rate) => {
      const service = rate.courier_service || {};
      const courier = service.name || service.umbrella_name || rate.courier_name || "Courier";

      return {
        courier,
        service: rate.description || rate.full_description || courier,
        currency: String(rate.currency || "USD").toUpperCase(),
        cents: Math.round(Number(rate.total_charge || 0) * 100)
      };
    })
    .filter((rate) => rate.cents > 0)
    .sort((a, b) => a.cents - b.cents)[0];

  return {
    country,
    ok: rates.length > 0,
    rateCount: rates.length,
    cheapest: cheapest || null,
    error: rates.length ? "" : "No rates returned."
  };
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.SHIPPING_TEST_TOKEN) {
      return sendJson({ error: "SHIPPING_TEST_TOKEN is not configured." }, 400);
    }

    if (!env.EASYSHIP_API_TOKEN) {
      return sendJson({ error: "EASYSHIP_API_TOKEN is not configured." }, 400);
    }

    const auth = request.headers.get("Authorization") || "";
    const body = await request.json();
    const token = cleanString(body.token || auth.replace(/^Bearer\s+/i, ""));

    if (token !== env.SHIPPING_TEST_TOKEN) {
      return sendJson({ error: "Unauthorized shipping test token." }, 401);
    }

    const countries = normalizeCountries(body.countries);
    const quantity = Math.max(1, Math.min(4, Math.round(Number(body.quantity || 1))));
    const incoterms = cleanString(body.incoterms || "DDU").toUpperCase();

    if (!countries.length) {
      return sendJson({ error: "Provide 2-letter country codes to test." }, 400);
    }

    const missingStateCountries = countries.filter((country) => REQUIRED_STATE_COUNTRIES.has(country) && !SAMPLE_ADDRESSES[country]?.state);
    if (missingStateCountries.length) {
      return sendJson({ error: `Missing state samples for ${missingStateCountries.join(", ")}.` }, 400);
    }

    if (!["DDU", "DDP"].includes(incoterms)) {
      return sendJson({ error: "Incoterms must be DDU or DDP." }, 400);
    }

    const results = [];
    for (const country of countries) {
      results.push(await testCountry(country, quantity, incoterms, env));
    }

    return sendJson({
      tested: results.length,
      passed: results.filter((result) => result.ok).length,
      failed: results.filter((result) => !result.ok).length,
      maxPerRun: MAX_COUNTRIES_PER_RUN,
      results
    });
  } catch (error) {
    return sendJson({ error: getErrorMessage(error, "Could not run country shipping test.") }, 400);
  }
}

export async function onRequest() {
  return sendJson({ error: "Method not allowed." }, 405);
}
