# Essentia

Essentia is a static launch site for a smart humidity-regulating mason jar cap.

## Pages

- `index.html` - landing page with hero imagery, founder price, and funding meter.
- `product.html` - product details, control logic, compatibility, and battery-life estimates.
- `presets.html` - interactive color touch LCD preset demo with food and herb RH targets.
- `about.html` - brand story, launch plan, and first-run cost assumptions.
- `preorder.html` - founder pricing, funding math, smart checkout, and preorder policy.
- `support.html` - support contact page and optional Cloudflare Function-backed support form.
- `privacy.html` - privacy policy for checkout, shipping, support, Stripe, Easyship, and Cloudflare.
- `terms.html` - terms of service, founder preorder terms, and no-return-unless-defective policy.

## Pricing assumptions

- Estimated landed unit COGS: `$112`
- Founder price: `$169`
- Planned MSRP: `$279`
- First-run quantity: `1,100` units
- Funding target: `$185,900`
- Founder Edition: first `1,100` units include specialty launch packaging and a numbered founder certificate.

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

The funding meter starts at zero and should be connected to real paid preorder counts before a production launch.

Battery-life and cost figures are pre-production estimates and should be updated after prototype testing, vendor quotes, and carrier validation.

## Easyship + Stripe smart checkout

The pre-order page includes a smart checkout flow:

1. Customer enters address and quantity.
2. Optional US address lookup uses `/api/address-suggest` to fill street, city, state, ZIP, and country from a selected match.
3. `/api/easyship-rates` calls Easyship from the server and returns live shipping choices.
4. Customer chooses a rate.
5. `/api/create-checkout-session` rechecks the Easyship rate server-side and opens Stripe Checkout with product plus shipping.

The founder promo video is stored at `assets/promo.mp4` and loops silently in the Founder Edition section.

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
- `SHIPPING_TEST_TOKEN`
- `SUPPORT_EMAIL`
- `RESEND_API_KEY`
- `SUPPORT_FROM_EMAIL`

Use `.env.example` as the template. Do not commit real API keys.

The support form uses `/api/support-message`. Without `RESEND_API_KEY`, the page still shows and opens the direct support email link: `faytsignup@gmail.com`.

## Country shipping test

After Cloudflare env vars are configured, open:

`/shipping-test`

The diagnostic requires `SHIPPING_TEST_TOKEN`. It runs live Easyship quote checks in batches of 25 countries and reports pass/fail, rate count, cheapest rate, and courier. A failed country is not automatically unsupported; it may need a better sample address, a DDU/DDP change, or lithium-battery carrier review.
