# RoomAI Shop V2 — Subscription Checkout Preview

A shoppable AI interior-design SaaS starter: Supabase Auth/Database/Storage, Stripe subscriptions + one-time credit top-ups, OpenAI image editing, room budgets, product matching, affiliate-link placeholders, credit ledger, click analytics, and protected dashboards.

## Pricing configured in the app
- Free: $0 / 5 basic redesigns
- Weekly: $6.99 / standard redesigns and detail edits + 5 premium credits every 7 days
- Monthly: $14.99 / standard redesigns and detail edits + 15 premium credits per month
- Yearly: $59.99 / standard redesigns and detail edits + 60 premium credits per year
- Credit pack checkout is hidden until pricing and fulfillment have been tested separately.

Purchased premium credits are stored separately and do not expire. Paid plans include unlimited standard redesigns subject to fair-use/rate limits. Premium credits refill after a successful renewal invoice.

## Credit costs
- Standard redesign: Free users 1 credit; included on paid plans
- Shoppable design + real-product matching: 2 premium credits
- Budget remix and edits of individual objects: included on paid plans (fair-use limits apply)
- High-resolution export is not yet available for purchase.

## What is real vs placeholder
**Real integrations included:** Supabase auth/database/storage wiring, Stripe Checkout + webhook wiring for subscriptions and one-time credit packs, OpenAI `gpt-image-2` edit wiring.

**Placeholder until retailer approval:** Amazon/Walmart/Temu/IKEA product feeds. Replace the mock provider with each retailer's approved affiliate/API implementation before production use. Do not scrape retailer sites.

## 1. Create Supabase
1. Create a Supabase project.
2. Open SQL Editor and run `supabase/schema.sql` in a fresh project.
3. Copy Project URL and Publishable Key to `.env.local`.
4. Copy Service Role Key to `.env.local` (server only; never expose it in browser code).

## 2. Create Stripe and connect your bank
Before accepting payments, run `supabase/billing.sql` in the same Supabase project after `schema.sql`. It locks profile balances against client edits and adds atomic, duplicate-safe purchase fulfillment. Do not enable checkout before this migration is applied.
1. Create/verify your Stripe business account using your own legal/business details.
2. In Stripe Dashboard -> Payout settings, add the bank account where you want subscription revenue deposited.
3. Create three recurring Prices:
   - Weekly: $6.99, recurring every 7 days
   - Monthly: $14.99, recurring monthly
   - Yearly: $59.99, recurring yearly
4. Copy the three recurring `price_...` IDs into `.env.local`. One-time credit pack prices are optional and are not currently advertised.
6. Copy Stripe secret + publishable keys.
7. Create webhook endpoint: `https://YOURDOMAIN.com/api/stripe/webhook`.
8. Subscribe the webhook to:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
9. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`.
10. Enable the Stripe Customer Portal in your Stripe Dashboard so customers can manage or cancel subscriptions.
11. Set credentials securely in a local test environment or a Vercel Preview environment, including `NEXT_PUBLIC_APP_URL` matching that environment. Use **test** Stripe keys, webhook secret and test price IDs together. Set `ROOMAI_PUBLIC_BILLING_ENABLED=true` only in that private test environment, leaving Production false. Verify account creation, a test subscription Checkout for each interval, `invoice.paid` credit fulfillment, cancellation and renewal. Confirm the signed webhook rejects invalid signatures and duplicate deliveries do not refill credits. Only after live onboarding and these tests should matching live credentials be placed in Production and the Production switch changed to true. Do not paste secret keys into chats or commit `.env.local`. The app validates subscription price amounts and intervals before redirecting to Checkout.

## 3. OpenAI
1. Create an OpenAI API key.
2. Put it in `OPENAI_API_KEY` in `.env.local`.
3. The current image model is `gpt-image-2`. Confirm its current image-editing price and quality settings before public billing; set `OPENAI_IMAGE_MODEL` only after testing the replacement model.

## 4. Retail affiliate accounts
Apply separately to Amazon Associates and other retailer/affiliate programs. Put only identifiers/tags in `.env.local`. Retailer payout settings are configured in each retailer/affiliate dashboard, not in this codebase.

## 5. Run locally
```bash
cp .env.example .env.local
npm install
npm run dev
```
Open http://localhost:3000.

## Money flow
- User subscriptions + credit top-ups -> Stripe -> Stripe balance -> your linked bank payout account.
- Furniture purchases -> retailer/affiliate network -> payout method configured in that affiliate account.

## Production TODOs
- Replace mock product provider with approved retailer APIs/data feeds.
- Add tax/legal pages (Terms, Privacy, affiliate disclosure, refund/cancellation policy).
- Run `supabase/billing.sql` in the connected Supabase project and test the Stripe webhook and Customer Portal with test payments. Code alone does not configure the Stripe or Supabase accounts.
- Add atomic database/RPC credit deduction to eliminate race conditions under high concurrency.
- Add image moderation/validation, file-size limits, rate limiting, observability and retries.
- Store generated image URLs as signed URLs on read (current DB URL expires after 7 days).
- Add exact product-image reference inputs when retailer terms permit it.
