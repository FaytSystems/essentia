(function () {
  const ALL_COUNTRIES = [
    "US", "CA", "GB", "AU", "NZ", "DE", "FR", "IT", "ES", "NL", "BE", "CH", "AT", "IE", "SE", "NO", "DK", "FI", "PL", "PT", "GR", "JP", "KR", "SG", "HK", "TW", "MY", "TH", "PH", "ID", "VN", "IN", "AE", "SA", "IL", "ZA", "MX", "BR", "AR", "CL", "CO", "PE",
    "AF", "AX", "AL", "DZ", "AS", "AD", "AO", "AI", "AG", "AM", "AW", "AZ", "BS", "BH", "BD", "BB", "BY", "BZ", "BJ", "BM", "BT", "BO", "BQ", "BA", "BW", "IO", "BN", "BG", "BF", "BI", "CV", "KH", "CM", "KY", "CF", "TD", "CN", "CX", "CC", "KM", "CG", "CD", "CK", "CR", "CI", "HR", "CW", "CY", "CZ", "DJ", "DM", "DO", "EC", "EG", "SV", "GQ", "ER", "EE", "SZ", "ET", "FK", "FO", "FJ", "GF", "PF", "GA", "GM", "GE", "GH", "GI", "GL", "GD", "GP", "GU", "GT", "GG", "GN", "GW", "GY", "HT", "VA", "HN", "HU", "IS", "IQ", "IM", "JM", "JE", "JO", "KZ", "KE", "KI", "KW", "KG", "LA", "LV", "LB", "LS", "LR", "LI", "LT", "LU", "MO", "MG", "MW", "MV", "ML", "MT", "MH", "MQ", "MR", "MU", "YT", "FM", "MD", "MC", "MN", "ME", "MS", "MA", "MZ", "MM", "NA", "NR", "NP", "NC", "NI", "NE", "NG", "NU", "NF", "MK", "MP", "OM", "PK", "PW", "PS", "PA", "PG", "PY", "PN", "PR", "QA", "RE", "RO", "RW", "BL", "SH", "KN", "LC", "MF", "PM", "VC", "WS", "SM", "ST", "SN", "RS", "SC", "SL", "SX", "SK", "SI", "SB", "SO", "GS", "SS", "LK", "SR", "SJ", "TJ", "TZ", "TL", "TG", "TK", "TO", "TT", "TN", "TR", "TM", "TC", "TV", "UG", "UA", "UM", "UY", "UZ", "VU", "VE", "VG", "VI", "WF", "EH", "YE", "ZM", "ZW"
  ];

  const PRIORITY_COUNTRIES = "US CA GB AU NZ DE FR IT ES NL BE CH AT IE SE NO DK FI PL PT GR JP KR SG HK TW MY TH PH ID VN IN AE SA IL ZA MX BR AR CL CO PE";

  const form = document.querySelector("[data-shipping-test-form]");
  const tokenInput = document.querySelector("[data-test-token]");
  const countryInput = document.querySelector("[data-test-countries]");
  const statusNode = document.querySelector("[data-test-status]");
  const resultsNode = document.querySelector("[data-test-results]");
  const priorityButton = document.querySelector("[data-priority-countries]");
  const allButton = document.querySelector("[data-all-countries]");

  if (!form || !tokenInput || !countryInput || !statusNode || !resultsNode) {
    return;
  }

  const formatMoney = function (cents, currency) {
    if (!cents) {
      return "";
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD"
    }).format(cents / 100);
  };

  const setStatus = function (message, tone) {
    statusNode.textContent = message;
    statusNode.className = "checkout-status" + (tone ? " " + tone : "");
  };

  const parseCountries = function () {
    return countryInput.value
      .split(/[\s,]+/)
      .map((country) => country.trim().toUpperCase())
      .filter((country) => /^[A-Z]{2}$/.test(country));
  };

  const renderResults = function (summary, append) {
    if (!append) {
      resultsNode.innerHTML = "";
    }

    const table = document.createElement("table");
    table.className = "test-table";
    table.innerHTML = "<thead><tr><th>Country</th><th>Status</th><th>Rates</th><th>Cheapest</th><th>Courier</th><th>Message</th></tr></thead>";
    const tbody = document.createElement("tbody");

    summary.results.forEach(function (result) {
      const row = document.createElement("tr");
      row.className = result.ok ? "pass" : "fail";
      row.innerHTML = [
        "<td>" + result.country + "</td>",
        "<td>" + (result.ok ? "Pass" : "Fail") + "</td>",
        "<td>" + result.rateCount + "</td>",
        "<td>" + (result.cheapest ? formatMoney(result.cheapest.cents, result.cheapest.currency) : "") + "</td>",
        "<td>" + (result.cheapest ? result.cheapest.courier : "") + "</td>",
        "<td>" + (result.error || (result.cheapest ? result.cheapest.service : "")) + "</td>"
      ].join("");
      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    resultsNode.appendChild(table);
  };

  const runBatch = async function (countries, append) {
    const data = new FormData(form);
    const payload = {
      token: tokenInput.value.trim(),
      quantity: Number(data.get("quantity") || 1),
      incoterms: String(data.get("incoterms") || "DDU"),
      countries
    };

    const response = await fetch("/api/test-shipping-countries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const summary = await response.json();

    if (!response.ok) {
      throw new Error(summary.error || "Country shipping test failed.");
    }

    renderResults(summary, append);
    return summary;
  };

  const runCountries = async function (countries) {
    const chunks = [];
    for (let index = 0; index < countries.length; index += 25) {
      chunks.push(countries.slice(index, index + 25));
    }

    let passed = 0;
    let failed = 0;
    resultsNode.innerHTML = "";

    for (let index = 0; index < chunks.length; index += 1) {
      setStatus("Testing batch " + (index + 1) + " of " + chunks.length + "...", "");
      const summary = await runBatch(chunks[index], index > 0);
      passed += summary.passed;
      failed += summary.failed;
    }

    setStatus("Done. Passed " + passed + ", failed " + failed + ".", failed ? "error" : "success");
  };

  priorityButton.addEventListener("click", function () {
    countryInput.value = PRIORITY_COUNTRIES;
  });

  allButton.addEventListener("click", function () {
    countryInput.value = ALL_COUNTRIES.join(" ");
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    const countries = parseCountries();

    if (!countries.length) {
      setStatus("Enter at least one 2-letter country code.", "error");
      return;
    }

    if (!tokenInput.value.trim()) {
      setStatus("Enter the shipping test token.", "error");
      return;
    }

    form.querySelector("button[type='submit']").disabled = true;

    try {
      await runCountries(countries);
    } catch (error) {
      setStatus(error.message || "Country shipping test failed.", "error");
    } finally {
      form.querySelector("button[type='submit']").disabled = false;
    }
  });

  countryInput.value = PRIORITY_COUNTRIES;
})();
