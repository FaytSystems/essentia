const TARGET_UNITS = 1100;
const FOUNDER_PRICE_CENTS = 16900;
const ORDER_PREFIX = "paid_session:";

function sendJson(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

function clampUnits(value) {
  const units = Number(value || 0);
  if (!Number.isFinite(units)) {
    return 0;
  }
  return Math.max(0, Math.round(units));
}

function getManualOffset(env) {
  return clampUnits(env.FOUNDER_UNITS_OFFSET);
}

async function getPaidOrders(env) {
  if (!env.ESSENTIA_FUNDING) {
    throw new Error("Funding KV namespace is not configured.");
  }

  const orders = [];
  let cursor;

  do {
    const page = await env.ESSENTIA_FUNDING.list({
      prefix: ORDER_PREFIX,
      cursor
    });

    const records = await Promise.all(
      page.keys.map(async (key) => {
        const record = await env.ESSENTIA_FUNDING.get(key.name, "json");
        return record || null;
      })
    );

    records.filter(Boolean).forEach((record) => {
      orders.push(record);
    });

    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  return orders;
}

export async function onRequestGet({ env }) {
  try {
    const orders = await getPaidOrders(env);
    const offsetUnits = getManualOffset(env);
    const paidUnits = orders.reduce((total, order) => total + clampUnits(order.units), 0);
    const reservedUnits = paidUnits + offsetUnits;
    const fundedPercent = TARGET_UNITS > 0 ? Math.min(100, (reservedUnits / TARGET_UNITS) * 100) : 0;

    return sendJson({
      reservedUnits,
      paidUnits,
      offsetUnits,
      targetUnits: TARGET_UNITS,
      remainingUnits: Math.max(0, TARGET_UNITS - reservedUnits),
      fundedPercent,
      orderCount: orders.length,
      founderPriceCents: FOUNDER_PRICE_CENTS,
      source: "kv"
    });
  } catch (error) {
    return sendJson({
      error: error.message || "Could not load funding status.",
      reservedUnits: 0,
      paidUnits: 0,
      offsetUnits: 0,
      targetUnits: TARGET_UNITS,
      remainingUnits: TARGET_UNITS,
      fundedPercent: 0,
      orderCount: 0,
      founderPriceCents: FOUNDER_PRICE_CENTS,
      source: "fallback"
    }, 200);
  }
}

export async function onRequest() {
  return sendJson({ error: "Method not allowed." }, 405);
}
