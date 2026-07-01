(function () {
  const PRODUCT_PRICE_CENTS = 16900;

  const form = document.querySelector("[data-smart-checkout-form]");
  const statusNode = document.querySelector("[data-shipping-status]");
  const rateOptions = document.querySelector("[data-rate-options]");
  const checkoutButton = document.querySelector("[data-checkout-button]");
  const rateButton = document.querySelector("[data-rate-button]");

  if (!form || !statusNode || !rateOptions || !checkoutButton) {
    return;
  }

  let selectedRateId = null;
  let currentPayload = null;
  let currentRates = [];

  const formatMoney = function (cents, currency) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD"
    }).format((Number(cents) || 0) / 100);
  };

  const getMessage = function (value, fallback) {
    if (!value) {
      return fallback;
    }

    if (typeof value === "string") {
      return value;
    }

    if (value instanceof Error && value.message) {
      return value.message;
    }

    if (value.message && value.message !== value) {
      return getMessage(value.message, fallback);
    }

    if (value.error && value.error !== value) {
      return getMessage(value.error, fallback);
    }

    if (Array.isArray(value.errors) && value.errors.length) {
      return value.errors.map(function (item) {
        return getMessage(item, "");
      }).filter(Boolean).join(" ");
    }

    if (Array.isArray(value) && value.length) {
      return value.map(function (item) {
        return getMessage(item, "");
      }).filter(Boolean).join(" ");
    }

    if (typeof value === "object") {
      const parts = Object.entries(value).map(function (entry) {
        const message = getMessage(entry[1], "");
        return message ? entry[0] + ": " + message : "";
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
  };

  const setStatus = function (message, tone) {
    statusNode.textContent = message || "";
    statusNode.className = "checkout-status" + (tone ? " " + tone : "");
  };

  const getPayload = function () {
    const data = new FormData(form);
    const quantity = Math.max(1, Math.min(4, Number(data.get("quantity") || 1)));
    const country = String(data.get("country") || "").trim().toUpperCase();

    return {
      quantity,
      customer: {
        name: String(data.get("name") || "").trim(),
        email: String(data.get("email") || "").trim()
      },
      address: {
        line1: String(data.get("line1") || "").trim(),
        line2: String(data.get("line2") || "").trim(),
        city: String(data.get("city") || "").trim(),
        state: String(data.get("state") || "").trim(),
        postalCode: String(data.get("postalCode") || "").trim(),
        country
      },
      incoterms: String(data.get("incoterms") || "DDU").trim().toUpperCase()
    };
  };

  const renderRates = function (rates, quantity) {
    selectedRateId = null;
    checkoutButton.disabled = true;
    checkoutButton.textContent = "Continue to Stripe Checkout";
    rateOptions.innerHTML = "";

    if (!rates.length) {
      setStatus("No Easyship rates came back for this address. Check the address or try DDU.", "error");
      return;
    }

    const productTotal = PRODUCT_PRICE_CENTS * quantity;
    const fragment = document.createDocumentFragment();

    rates.slice(0, 6).forEach(function (rate, index) {
      const id = "rate-" + index;
      const shipping = Number(rate.totalChargeCents || 0);
      const orderTotal = productTotal + shipping;
      const label = document.createElement("label");
      label.className = "rate-option";
      label.innerHTML = [
        '<input type="radio" name="easyshipRate" value="' + rate.id + '">',
        '<span>',
        '<strong>' + rate.courierName + '</strong>',
        '<small>' + (rate.serviceName || rate.incoterms || "Shipping option") + '</small>',
        '</span>',
        '<b>' + formatMoney(shipping, rate.currency) + '</b>',
        '<em>Total ' + formatMoney(orderTotal, rate.currency) + '</em>',
        '<small>' + (rate.deliveryWindow || "Delivery estimate shown by carrier") + '</small>'
      ].join("");

      label.querySelector("input").id = id;
      label.querySelector("input").addEventListener("change", function () {
        selectedRateId = rate.id;
        checkoutButton.disabled = false;
        checkoutButton.textContent = "Pay " + formatMoney(orderTotal, rate.currency) + " with Stripe";
      });

      fragment.appendChild(label);
    });

    rateOptions.appendChild(fragment);
    setStatus("Choose a shipping option. The selected quote will be rechecked before Stripe opens.", "success");
  };

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    currentPayload = getPayload();
    currentRates = [];
    selectedRateId = null;
    rateOptions.innerHTML = "";
    checkoutButton.disabled = true;
    rateButton.disabled = true;
    setStatus("Getting live Easyship rates...", "");

    try {
      const response = await fetch("/api/easyship-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentPayload)
      });
      const data = await response.json().catch(function () {
        return {};
      });

      if (!response.ok) {
        throw new Error(getMessage(data, "Could not calculate shipping."));
      }

      currentRates = data.rates || [];
      renderRates(currentRates, currentPayload.quantity);
    } catch (error) {
      setStatus(getMessage(error, "Could not calculate shipping."), "error");
    } finally {
      rateButton.disabled = false;
    }
  });

  checkoutButton.addEventListener("click", async function () {
    if (!currentPayload || !selectedRateId) {
      setStatus("Choose a shipping option before opening checkout.", "error");
      return;
    }

    checkoutButton.disabled = true;
    setStatus("Rechecking the selected rate and opening Stripe Checkout...", "");

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...currentPayload,
          selectedRateId
        })
      });
      const data = await response.json().catch(function () {
        return {};
      });

      if (!response.ok) {
        throw new Error(getMessage(data, "Could not open Stripe Checkout."));
      }

      window.location.href = data.url;
    } catch (error) {
      setStatus(getMessage(error, "Could not open Stripe Checkout."), "error");
      checkoutButton.disabled = false;
    }
  });
})();
