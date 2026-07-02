const DEFAULT_SUPPORT_EMAIL = "faytsignup@gmail.com";
const SIGNATURE_TOLERANCE_SECONDS = 300;
const HANDLED_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed"
]);

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

function getMessage(value, fallback) {
  if (!value) {
    return fallback;
  }

  if (typeof value === "string") {
    return value;
  }

  if (value.message && value.message !== value) {
    return getMessage(value.message, fallback);
  }

  if (value.error && value.error !== value) {
    return getMessage(value.error, fallback);
  }

  return fallback;
}

function getSupportEmail(env) {
  return cleanString(env.SUPPORT_EMAIL) || DEFAULT_SUPPORT_EMAIL;
}

function parseStripeSignature(header) {
  const parts = String(header || "").split(",");
  const parsed = {
    timestamp: "",
    signatures: []
  };

  parts.forEach((part) => {
    const [key, value] = part.split("=");
    if (key === "t") {
      parsed.timestamp = cleanString(value);
    }
    if (key === "v1" && value) {
      parsed.signatures.push(cleanString(value));
    }
  });

  return parsed;
}

function hexToBytes(hex) {
  const normalized = cleanString(hex);
  if (!/^[0-9a-f]+$/i.test(normalized) || normalized.length % 2 !== 0) {
    return new Uint8Array();
  }

  const bytes = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < normalized.length; index += 2) {
    bytes[index / 2] = parseInt(normalized.slice(index, index + 2), 16);
  }
  return bytes;
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a[index] ^ b[index];
  }
  return result === 0;
}

async function computeSignature(secret, payload) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
}

async function verifyStripeEvent(request, env) {
  const webhookSecret = cleanString(env.STRIPE_WEBHOOK_SECRET);
  if (!webhookSecret) {
    throw new Error("Stripe webhook signing secret is not configured.");
  }

  const signatureHeader = request.headers.get("Stripe-Signature");
  const payload = await request.text();
  const signature = parseStripeSignature(signatureHeader);
  const timestamp = Number(signature.timestamp);

  if (!signature.timestamp || !signature.signatures.length || !Number.isFinite(timestamp)) {
    throw new Error("Missing or invalid Stripe signature.");
  }

  const age = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
  if (age > SIGNATURE_TOLERANCE_SECONDS) {
    throw new Error("Stripe signature timestamp is outside the allowed tolerance.");
  }

  const signedPayload = `${signature.timestamp}.${payload}`;
  const expected = await computeSignature(webhookSecret, signedPayload);
  const hasValidSignature = signature.signatures.some((candidate) => {
    const actual = hexToBytes(candidate);
    return constantTimeEqual(actual, expected);
  });

  if (!hasValidSignature) {
    throw new Error("Stripe signature verification failed.");
  }

  return JSON.parse(payload);
}

function formatMoney(cents, currency) {
  const value = Number(cents || 0) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: String(currency || "usd").toUpperCase()
  }).format(value);
}

function getQuantity(session) {
  const rawQuantity = session.metadata && session.metadata.quantity;
  const parsed = Number(rawQuantity);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.round(parsed);
  }
  return 1;
}

function getShippingAddress(session) {
  const details = session.shipping_details || {};
  const address = details.address || {};
  const metadata = session.metadata || {};

  if (address.line1 || address.city || address.postal_code) {
    return [
      details.name,
      address.line1,
      address.line2,
      [address.city, address.state, address.postal_code].filter(Boolean).join(", "),
      address.country
    ].filter(Boolean).join("\n");
  }

  if (metadata.shipping_address_json) {
    try {
      const parsed = JSON.parse(metadata.shipping_address_json);
      return [
        parsed.line1,
        parsed.line2,
        [parsed.city, parsed.state, parsed.postalCode].filter(Boolean).join(", "),
        parsed.country
      ].filter(Boolean).join("\n");
    } catch (error) {
      return metadata.shipping_address_json;
    }
  }

  return "No shipping address found on the session.";
}

function buildNotification(event, session) {
  const metadata = session.metadata || {};
  const customer = session.customer_details || {};
  const email = customer.email || session.customer_email || "No customer email";
  const customerName = customer.name || metadata.customer_name || "No customer name";
  const paymentStatus = session.payment_status || "unknown";
  const quantity = getQuantity(session);
  const total = formatMoney(session.amount_total, session.currency);
  const shipping = formatMoney((session.total_details && session.total_details.amount_shipping) || 0, session.currency);
  const subjectPrefix = event.type === "checkout.session.async_payment_failed" ? "Payment failed" : "Paid checkout";

  return {
    subject: `Essentia ${subjectPrefix}: ${session.id}`,
    text: [
      `Event: ${event.type}`,
      `Session: ${session.id}`,
      `Payment status: ${paymentStatus}`,
      `Customer: ${customerName}`,
      `Email: ${email}`,
      `Quantity: ${quantity}`,
      `Total: ${total}`,
      `Shipping: ${shipping}`,
      `Founder edition: ${metadata.founder_edition || "not set"}`,
      `Easyship courier: ${metadata.easyship_courier_name || "not set"}`,
      `Easyship courier id: ${metadata.easyship_courier_id || "not set"}`,
      `Incoterms: ${metadata.incoterms || "not set"}`,
      "",
      "Shipping address:",
      getShippingAddress(session),
      "",
      `Stripe dashboard: https://dashboard.stripe.com/payments/${session.payment_intent || ""}`
    ].join("\n")
  };
}

async function sendAdminNotification(env, event, session) {
  if (!env.RESEND_API_KEY) {
    return {
      configured: false
    };
  }

  const supportEmail = getSupportEmail(env);
  const from = cleanString(env.SUPPORT_FROM_EMAIL) || "Essentia Support <onboarding@resend.dev>";
  const notification = buildNotification(event, session);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [supportEmail],
      subject: notification.subject,
      text: notification.text
    })
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(getMessage(data, "Could not send the webhook notification email."));
  }

  return {
    configured: true,
    id: data.id || null
  };
}

async function handleCheckoutEvent(event, env) {
  if (!HANDLED_EVENTS.has(event.type)) {
    return {
      handled: false,
      reason: "ignored_event_type"
    };
  }

  const session = event.data && event.data.object;
  if (!session || session.object !== "checkout.session") {
    throw new Error("Stripe event did not include a Checkout Session.");
  }

  const isFounderOrder = !session.metadata || !session.metadata.order_type || session.metadata.order_type === "founder_preorder";
  if (!isFounderOrder) {
    return {
      handled: false,
      reason: "ignored_order_type",
      sessionId: session.id
    };
  }

  if (event.type === "checkout.session.completed" && session.payment_status !== "paid") {
    return {
      handled: true,
      action: "awaiting_async_payment",
      sessionId: session.id,
      paymentStatus: session.payment_status
    };
  }

  const notification = await sendAdminNotification(env, event, session);
  return {
    handled: true,
    action: event.type === "checkout.session.async_payment_failed" ? "payment_failed_notified" : "paid_checkout_notified",
    sessionId: session.id,
    notification
  };
}

export async function onRequestPost({ request, env }) {
  try {
    const event = await verifyStripeEvent(request, env);
    const result = await handleCheckoutEvent(event, env);

    return sendJson({
      received: true,
      eventId: event.id || null,
      eventType: event.type || null,
      ...result
    });
  } catch (error) {
    return sendJson({
      received: false,
      error: getMessage(error, "Could not process Stripe webhook.")
    }, 400);
  }
}

export async function onRequestGet() {
  return sendJson({
    ok: true,
    endpoint: "stripe-webhook",
    accepts: Array.from(HANDLED_EVENTS)
  });
}

export async function onRequest() {
  return sendJson({ error: "Method not allowed." }, 405);
}
