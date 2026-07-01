# Essentia

Essentia is a static launch site for a smart humidity-regulating mason jar cap.

## Pages

- `index.html` - landing page with hero imagery, founder price, and funding meter.
- `product.html` - product details, control logic, compatibility, and battery-life estimates.
- `presets.html` - interactive color touch LCD preset demo with food and herb RH targets.
- `about.html` - brand story, launch plan, and first-run cost assumptions.
- `preorder.html` - founder pricing, funding math, and a reservation form demo.

## Pricing assumptions

- Estimated landed unit COGS: `$112`
- Founder price: `$169`
- Planned MSRP: `$279`
- First-run quantity: `1,100` units
- Funding target: `$185,900`

The funding target is modeled as:

- `$123,200` for founder-run COGS
- `$45,700` for tooling, fixtures, packaging setup, and validation prep
- `$12,000` for freight, QA, and launch buffer
- `$5,000` profit reserve

## Premium component assumptions

- 4-layer ENIG PCB assembly with test points and a moisture-conscious coating plan.
- Protected name-brand 2,500 to 3,000 mAh lithium-ion or lithium-polymer battery pack.
- Premium low-noise internal actuator package for controlled air movement.
- Color capacitive touch LCD instead of a basic monochrome display.
- Higher QA, packaging, and validation reserves than the first draft.

## Notes

The pre-order form is front-end only. It updates the meter in local storage for demo purposes and should be connected to a real checkout system before launch.

Battery-life and cost figures are pre-production estimates and should be updated after prototype testing and vendor quotes.

## Easyship + Stripe smart checkout

The pre-order page includes a smart checkout flow:

1. Customer enters address and quantity.
2. `/api/easyship-rates` calls Easyship from the server and returns live shipping choices.
3. Customer chooses a rate.
4. `/api/create-checkout-session` rechecks the Easyship rate server-side and opens Stripe Checkout with product plus shipping.

This requires Cloudflare Pages Functions or another serverless host. GitHub Pages cannot run the `/api` functions.

Set these environment variables in your host:

- `EASYSHIP_API_TOKEN`
- `EASYSHIP_API_BASE`
- `EASYSHIP_ORIGIN_LINE1`
- `EASYSHIP_ORIGIN_LINE2`
- `EASYSHIP_ORIGIN_CITY`
- `EASYSHIP_ORIGIN_STATE`
- `EASYSHIP_ORIGIN_POSTAL_CODE`
- `EASYSHIP_ORIGIN_COUNTRY`
- `STRIPE_SECRET_KEY`
- `SITE_URL`
- `SHIPPING_HANDLING_CENTS`

Use `.env.example` as the template. Do not commit real API keys.
