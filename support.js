(function () {
  const form = document.querySelector("[data-support-form]");
  const statusNode = document.querySelector("[data-support-status]");
  const submitButton = document.querySelector("[data-support-submit]");

  if (!form || !statusNode || !submitButton) {
    return;
  }

  const setStatus = function (message, tone) {
    statusNode.textContent = message || "";
    statusNode.className = "checkout-status" + (tone ? " " + tone : "");
  };

  const getPayload = function () {
    const data = new FormData(form);

    return {
      name: String(data.get("name") || "").trim(),
      email: String(data.get("email") || "").trim(),
      orderNumber: String(data.get("orderNumber") || "").trim(),
      subject: String(data.get("subject") || "").trim(),
      message: String(data.get("message") || "").trim()
    };
  };

  const getMessage = function (value, fallback) {
    if (!value) {
      return fallback;
    }

    if (typeof value === "string") {
      return value;
    }

    if (value.message) {
      return value.message;
    }

    if (value.error) {
      return value.error;
    }

    return fallback;
  };

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    submitButton.disabled = true;
    setStatus("Sending support message...", "");

    try {
      const response = await fetch("/api/support-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(getPayload())
      });
      const data = await response.json().catch(function () {
        return {};
      });

      if (!response.ok) {
        if (data.mailto) {
          setStatus(getMessage(data, "Email support directly.") + " Opening your email app...", "error");
          window.location.href = data.mailto;
          return;
        }

        throw new Error(getMessage(data, "Could not send the support message."));
      }

      form.reset();
      setStatus("Support message sent. We will reply by email.", "success");
    } catch (error) {
      setStatus(getMessage(error, "Could not send the support message. Email faytsignup@gmail.com directly."), "error");
    } finally {
      submitButton.disabled = false;
    }
  });
})();
