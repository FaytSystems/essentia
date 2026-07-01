const DEFAULT_SUPPORT_EMAIL = "faytsignup@gmail.com";

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

function buildMailto(email, payload) {
  const subject = encodeURIComponent(`Essentia support: ${payload.subject || "Support request"}`);
  const body = encodeURIComponent([
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    payload.orderNumber ? `Order: ${payload.orderNumber}` : "",
    "",
    payload.message
  ].filter(Boolean).join("\n"));

  return `mailto:${email}?subject=${subject}&body=${body}`;
}

function validatePayload(body) {
  const payload = {
    name: cleanString(body.name),
    email: cleanString(body.email).toLowerCase(),
    orderNumber: cleanString(body.orderNumber),
    subject: cleanString(body.subject),
    message: cleanString(body.message)
  };

  if (!payload.name || !payload.email || !payload.message) {
    throw new Error("Name, email, and message are required.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    throw new Error("Enter a valid email address.");
  }

  if (payload.message.length > 4000) {
    throw new Error("Message must be 4,000 characters or less.");
  }

  return payload;
}

async function sendWithResend(env, supportEmail, payload) {
  if (!env.RESEND_API_KEY) {
    return {
      configured: false
    };
  }

  const from = cleanString(env.SUPPORT_FROM_EMAIL) || "Essentia Support <onboarding@resend.dev>";
  const subject = `Essentia support: ${payload.subject || payload.orderNumber || "Support request"}`;
  const text = [
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    payload.orderNumber ? `Order: ${payload.orderNumber}` : "",
    "",
    payload.message
  ].filter(Boolean).join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [supportEmail],
      reply_to: payload.email,
      subject,
      text
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(getMessage(data, "Could not send the support message."));
  }

  return {
    configured: true,
    id: data.id || null
  };
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const payload = validatePayload(body);
    const supportEmail = getSupportEmail(env);
    const result = await sendWithResend(env, supportEmail, payload);

    if (!result.configured) {
      return sendJson({
        error: `Email sending is not configured yet. Please email ${supportEmail} directly.`,
        mailto: buildMailto(supportEmail, payload),
        supportEmail
      }, 501);
    }

    return sendJson({
      ok: true,
      id: result.id,
      supportEmail
    });
  } catch (error) {
    return sendJson({
      error: getMessage(error, "Could not send the support message."),
      supportEmail: getSupportEmail(env)
    }, 400);
  }
}

export async function onRequestGet({ env }) {
  return sendJson({
    supportEmail: getSupportEmail(env)
  });
}

export async function onRequest() {
  return sendJson({ error: "Method not allowed." }, 405);
}
