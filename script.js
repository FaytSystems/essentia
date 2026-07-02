(function () {
  const funding = {
    price: 169,
    msrp: 279,
    baseUnits: 0,
    targetUnits: 1100,
    targetRevenue: 185900
  };

  const presets = {
    herbs: {
      label: "Culinary herbs",
      rh: 55,
      status: "Holds aroma-focused storage for dried herbs while avoiding damp outside air."
    },
    flower: {
      label: "Legal flower",
      rh: 62,
      status: "A connoisseur preset for legal botanical flower where local rules permit."
    },
    rice: {
      label: "Rice",
      rh: 35,
      status: "Keeps the jar biased toward dry storage for grains."
    },
    cereal: {
      label: "Cereal",
      rh: 35,
      status: "Protects crunch by refusing exchange when the room is too humid."
    },
    flour: {
      label: "Flour",
      rh: 40,
      status: "Targets dry pantry storage for baking staples."
    },
    sugar: {
      label: "Sugar",
      rh: 30,
      status: "Helps reduce clumping by favoring lower relative humidity."
    },
    coffee: {
      label: "Coffee",
      rh: 50,
      status: "A moderate preset for aroma retention in whole beans."
    },
    tea: {
      label: "Tea",
      rh: 45,
      status: "Balanced for dried leaves and delicate aromatics."
    }
  };

  const socialLinks = [
    { label: "X", url: "https://x.com/BudCurer" },
    { label: "Instagram", url: "https://www.instagram.com/essentia_budcurer/" },
    { label: "Facebook", url: "https://www.facebook.com/profile.php?id=61591247774916" },
    { label: "YouTube", url: "https://www.youtube.com/@EssentiaBudCurer" }
  ];

  const globalCountryCodes = "AD,AE,AF,AG,AI,AL,AM,AO,AR,AS,AT,AU,AW,AX,AZ,BA,BB,BD,BE,BF,BG,BH,BI,BJ,BL,BM,BN,BO,BQ,BR,BS,BT,BW,BY,BZ,CA,CC,CD,CF,CG,CH,CI,CK,CL,CM,CN,CO,CR,CV,CW,CX,CY,CZ,DE,DJ,DK,DM,DO,DZ,EC,EE,EG,EH,ER,ES,ET,FI,FJ,FK,FM,FO,FR,GA,GB,GD,GE,GF,GG,GH,GI,GL,GM,GN,GP,GQ,GR,GS,GT,GU,GW,GY,HK,HN,HR,HT,HU,ID,IE,IL,IM,IN,IO,IQ,IS,IT,JE,JM,JO,JP,KE,KG,KH,KI,KM,KN,KR,KW,KY,KZ,LA,LB,LC,LI,LK,LR,LS,LT,LU,LV,MA,MC,MD,ME,MF,MG,MH,MK,ML,MM,MN,MO,MP,MQ,MR,MS,MT,MU,MV,MW,MX,MY,MZ,NA,NC,NE,NF,NG,NI,NL,NO,NP,NR,NU,NZ,OM,PA,PE,PF,PG,PH,PK,PL,PM,PN,PR,PS,PT,PW,PY,QA,RE,RO,RS,RW,SA,SB,SC,SE,SG,SH,SI,SJ,SK,SL,SM,SN,SR,SS,ST,SV,SX,SZ,TC,TD,TG,TH,TJ,TK,TL,TM,TN,TO,TR,TT,TV,TW,TZ,UA,UG,UM,US,UY,UZ,VA,VC,VG,VI,VN,VU,WF,WS,YT,ZA,ZM,ZW".split(",");

  const iconSvg = {
    herbs: '<svg viewBox="0 0 120 90" aria-hidden="true"><path d="M58 76C56 55 64 34 80 18" fill="none" stroke="#5f8a6d" stroke-width="6" stroke-linecap="round"/><path d="M68 45c16-8 26-7 33-1-8 11-21 12-33 1Z" fill="#76a87d"/><path d="M55 57c-17-3-26 2-31 10 11 7 23 4 31-10Z" fill="#86b98c"/><path d="M74 31c-8-14-18-19-28-18-1 13 9 22 28 18Z" fill="#9bc575"/></svg>',
    flower: '<svg viewBox="0 0 120 90" aria-hidden="true"><circle cx="60" cy="45" r="10" fill="#dba852"/><path d="M60 9c9 15 9 28 0 36-9-8-9-21 0-36ZM60 81c-9-15-9-28 0-36 9 8 9 21 0 36ZM24 24c17 4 28 11 31 23-12 3-24-5-31-23ZM96 66c-17-4-28-11-31-23 12-3 24 5 31 23ZM96 24c-7 18-19 26-31 23 3-12 14-19 31-23ZM24 66c7-18 19-26 31-23-3 12-14 19-31 23Z" fill="#5f8a6d"/></svg>',
    rice: '<svg viewBox="0 0 120 90" aria-hidden="true"><ellipse cx="34" cy="53" rx="10" ry="21" transform="rotate(68 34 53)" fill="#f4ecd4"/><ellipse cx="56" cy="43" rx="10" ry="22" transform="rotate(73 56 43)" fill="#fff7df"/><ellipse cx="77" cy="56" rx="9" ry="20" transform="rotate(67 77 56)" fill="#efe2be"/><ellipse cx="64" cy="65" rx="9" ry="19" transform="rotate(83 64 65)" fill="#f9f1d8"/></svg>',
    cereal: '<svg viewBox="0 0 120 90" aria-hidden="true"><path d="M24 44h72l-10 27H34L24 44Z" fill="#d6e4ee"/><ellipse cx="60" cy="44" rx="36" ry="13" fill="#ffffff"/><circle cx="43" cy="42" r="8" fill="#dba852"/><circle cx="62" cy="39" r="8" fill="#c77944"/><circle cx="76" cy="45" r="8" fill="#dba852"/><circle cx="55" cy="50" r="8" fill="#b06a38"/></svg>',
    flour: '<svg viewBox="0 0 120 90" aria-hidden="true"><path d="M32 64c7-20 49-20 56 0 2 8-8 14-28 14s-30-6-28-14Z" fill="#f5efe5"/><path d="M71 42l32-15 4 8-32 15Z" fill="#caa47b"/><path d="M43 31h34l8 31H35l8-31Z" fill="#fffaf0"/><path d="M42 31c7-10 29-10 36 0" fill="none" stroke="#d9c9ab" stroke-width="5" stroke-linecap="round"/></svg>',
    sugar: '<svg viewBox="0 0 120 90" aria-hidden="true"><rect x="28" y="47" width="24" height="24" rx="4" fill="#f8fbff"/><rect x="48" y="30" width="24" height="24" rx="4" fill="#eef6fb"/><rect x="69" y="47" width="24" height="24" rx="4" fill="#ffffff"/><path d="M32 48l16 22M52 31l17 22M73 48l17 22" stroke="#d7e5ee" stroke-width="3"/></svg>',
    coffee: '<svg viewBox="0 0 120 90" aria-hidden="true"><ellipse cx="45" cy="49" rx="17" ry="27" transform="rotate(28 45 49)" fill="#6f4532"/><path d="M42 27c8 13 7 29-4 44" fill="none" stroke="#b87752" stroke-width="4" stroke-linecap="round"/><ellipse cx="75" cy="45" rx="17" ry="27" transform="rotate(-28 75 45)" fill="#8a563b"/><path d="M79 23c-8 13-7 30 4 44" fill="none" stroke="#c7865e" stroke-width="4" stroke-linecap="round"/></svg>',
    tea: '<svg viewBox="0 0 120 90" aria-hidden="true"><path d="M22 60c26-35 58-42 77-25-17 29-49 38-77 25Z" fill="#7cae75"/><path d="M30 58c24-11 42-17 64-22" fill="none" stroke="#315744" stroke-width="5" stroke-linecap="round"/><path d="M48 50c-3-12-1-22 6-31 13 12 15 24 4 35" fill="#9bc575"/></svg>'
  };

  const formatMoney = function (value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(value);
  };

  const updateFunding = function () {
    const units = funding.baseUnits;
    const percent = Math.min(100, Math.round((units / funding.targetUnits) * 100));

    document.querySelectorAll("[data-target-amount]").forEach(function (node) {
      node.textContent = formatMoney(funding.targetRevenue);
    });
    document.querySelectorAll("[data-funded-percent]").forEach(function (node) {
      node.textContent = percent + "%";
    });
    document.querySelectorAll("[data-funded-units]").forEach(function (node) {
      node.textContent = units.toLocaleString("en-US");
    });
    document.querySelectorAll("[data-target-units]").forEach(function (node) {
      node.textContent = funding.targetUnits.toLocaleString("en-US");
    });
    document.querySelectorAll("[data-founder-price]").forEach(function (node) {
      node.textContent = formatMoney(funding.price);
    });
    document.querySelectorAll("[data-msrp]").forEach(function (node) {
      node.textContent = formatMoney(funding.msrp);
    });
    document.querySelectorAll("[data-meter-fill]").forEach(function (node) {
      node.style.width = percent + "%";
    });
  };

  const setPreset = function (key) {
    const preset = presets[key] || presets.herbs;
    document.querySelectorAll("[data-screen-rh]").forEach(function (node) {
      node.textContent = preset.rh;
    });
    document.querySelectorAll("[data-screen-label]").forEach(function (node) {
      node.textContent = preset.label;
    });
    document.querySelectorAll("[data-screen-status]").forEach(function (node) {
      node.textContent = preset.status;
    });
    document.querySelectorAll("[data-screen-icon]").forEach(function (node) {
      node.innerHTML = iconSvg[key] || iconSvg.herbs;
    });
    document.querySelectorAll("[data-preset]").forEach(function (node) {
      node.classList.toggle("is-active", node.getAttribute("data-preset") === key);
    });
  };

  const initNavigation = function () {
    const toggle = document.querySelector("[data-menu-toggle]");
    const nav = document.querySelector("[data-site-nav]");
    if (toggle && nav) {
      toggle.addEventListener("click", function () {
        const open = nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(open));
      });
    }

    const normalizePage = function (value) {
      return String(value || "index.html").replace(/\.html$/i, "") || "index";
    };
    const page = normalizePage(window.location.pathname.split("/").pop());
    document.querySelectorAll(".site-nav a").forEach(function (link) {
      const href = normalizePage(link.getAttribute("href"));
      if (href === page) {
        link.classList.add("is-current");
      }
    });
  };

  const initPresets = function () {
    document.querySelectorAll("[data-preset]").forEach(function (node) {
      node.addEventListener("click", function () {
        setPreset(node.getAttribute("data-preset"));
      });
    });

    const manual = document.querySelector("[data-manual-rh]");
    if (manual) {
      manual.addEventListener("input", function () {
        document.querySelectorAll("[data-screen-rh]").forEach(function (node) {
          node.textContent = manual.value;
        });
        document.querySelectorAll("[data-screen-label]").forEach(function (node) {
          node.textContent = "Manual";
        });
        document.querySelectorAll("[data-screen-status]").forEach(function (node) {
          node.textContent = "Manual override sets the desired target; Essentia still waits for room conditions that help.";
        });
        document.querySelectorAll("[data-manual-value]").forEach(function (node) {
          node.textContent = manual.value + "%";
        });
        document.querySelectorAll("[data-preset]").forEach(function (node) {
          node.classList.remove("is-active");
        });
      });
    }

    if (document.querySelector("[data-screen-rh]")) {
      setPreset("herbs");
    }
  };

  const initSocialLinks = function () {
    const footer = document.querySelector(".site-footer .footer-inner");
    if (!footer || footer.querySelector(".footer-social")) {
      return;
    }

    const nav = document.createElement("nav");
    nav.className = "footer-social";
    nav.setAttribute("aria-label", "Social media");

    socialLinks.forEach(function (item) {
      const link = document.createElement("a");
      link.href = item.url;
      link.textContent = item.label;
      link.target = "_blank";
      link.rel = "noopener";
      nav.appendChild(link);
    });

    footer.appendChild(nav);
  };

  const initCountryCodes = function () {
    const list = document.querySelector("#country-codes");
    if (!list) {
      return;
    }

    const displayNames = typeof Intl.DisplayNames === "function"
      ? new Intl.DisplayNames(["en"], { type: "region" })
      : null;
    const fragment = document.createDocumentFragment();

    list.innerHTML = "";
    globalCountryCodes.forEach(function (code) {
      const option = document.createElement("option");
      option.value = code;
      option.textContent = displayNames ? displayNames.of(code) || code : code;
      fragment.appendChild(option);
    });

    list.appendChild(fragment);
  };

  initNavigation();
  initPresets();
  initSocialLinks();
  initCountryCodes();
  updateFunding();
})();
