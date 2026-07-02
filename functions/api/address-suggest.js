const CENSUS_GEOCODER_URL = "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress";

function sendJson(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders
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

  return fallback;
}

function buildStreetLine(components, matchedAddress) {
  const firstMatchPart = cleanString(matchedAddress).split(",")[0];
  const houseNumber = cleanString(components.fromAddress || components.toAddress);
  const parts = [
    houseNumber,
    cleanString(components.preDirection),
    cleanString(components.preType),
    cleanString(components.streetName),
    cleanString(components.suffixType),
    cleanString(components.suffixDirection)
  ].filter(Boolean);

  return parts.join(" ") || firstMatchPart;
}

function normalizeMatch(match) {
  const components = match.addressComponents || {};
  const line1 = buildStreetLine(components, match.matchedAddress);
  const city = cleanString(components.city);
  const state = cleanString(components.state);
  const postalCode = cleanString(components.zip);
  const label = cleanString(match.matchedAddress) || [line1, city, state, postalCode].filter(Boolean).join(", ");

  if (!line1 || !city || !state || !postalCode) {
    return null;
  }

  return {
    label,
    line1,
    city,
    state,
    postalCode,
    country: "US"
  };
}

export async function onRequestGet({ request }) {
  try {
    const url = new URL(request.url);
    const query = cleanString(url.searchParams.get("q"));

    if (query.length < 5) {
      return sendJson({ suggestions: [] });
    }

    const geocodeUrl = new URL(CENSUS_GEOCODER_URL);
    geocodeUrl.searchParams.set("address", query);
    geocodeUrl.searchParams.set("benchmark", "Public_AR_Current");
    geocodeUrl.searchParams.set("format", "json");

    const response = await fetch(geocodeUrl.toString(), {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Essentia address lookup"
      }
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(getErrorMessage(data, "Address lookup is unavailable."));
    }

    const matches = data.result && Array.isArray(data.result.addressMatches) ? data.result.addressMatches : [];
    const suggestions = matches.map(normalizeMatch).filter(Boolean).slice(0, 5);

    return sendJson(
      { suggestions },
      200,
      { "Cache-Control": "public, max-age=86400" }
    );
  } catch (error) {
    return sendJson({ error: getErrorMessage(error, "Could not load address suggestions.") }, 400);
  }
}

export async function onRequest() {
  return sendJson({ error: "Method not allowed." }, 405);
}
