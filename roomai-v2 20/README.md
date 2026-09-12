# RoomAI Shop V2 — Accessible Base + Premium Add-ons

A shoppable AI interior-design SaaS starter: Supabase Auth/Database/Storage, Stripe subscriptions + one-time credit top-ups, OpenAI image editing, room budgets, product matching, affiliate-link placeholders, credit ledger, click analytics, and protected dashboards.

## Pricing configured in the app
- Free: $0 / 5 basic redesigns
- Weekly: $6.99 / unlimited basic redesigns + 5 premium credits every 7 days
- Monthly: $14.99 / unlimited basic redesigns + 15 premium credits per month
- Yearly: $59.99 / unlimited basic redesigns + 60 premium credits per year
- Premium top-up: 10 credits / $4.99
- Premium top-up: 30 credits / $9.99
- Premium top-up: 100 credits / $24.99

Purchased premium credits are stored separately and do not expire. Paid plans include unlimited standard redesigns subject to fair-use/rate limits. Premium credits refill after a successful renewal invoice.

## Credit costs
- Standard redesign: Free users 1 credit; included on paid plans
- Shoppable design + real-product matching: 2 premium credits
- Budget remix / cheaper version: 1 premium credit
- Product swap: 1 premium credit
- High-resolution final render: 2 premium credits

## What is real vs placeholder
**Real integrations included:** Supabase auth/database/storage wiring, Stripe Checkout + webhook wiring for subscriptions and one-time credit packs, OpenAI `gpt-image-2` edit wiring.

**Placeholder until retailer approval:** Amazon/Walmart/Temu/IKEA product feeds. Replace the mock provider with each retailer's approved affiliate/API implementation before production use. Do not scrape retailer sites.

## 1. Create Supabase
1. Create a Supabase project.
2. Open SQL Editor and run `supabase/schema.sql` in a fresh project.
3. Copy Project URL and Publishable Key to `.env.local`.
4. Copy Service Role Key to `.env.local` (server only; never expose it in browser code).

## 2. Create Stripe and connect your bank
1. Create/verify your Stripe business account using your own legal/business details.
2. In Stripe Dashboard -> Payout settings, add the bank account where you want subscription revenue deposited.
3. Create three recurring Prices:
   - Weekly: $12.99, recurring every 7 days
   - Monthly: $29.99, recurring monthly
   - Yearly: $249, recurring yearly
4. Create three one-time Prices:
   - 10 premium credits: $4.99
   - 30 premium credits: $9.99
   - 100 premium credits: $24.99
5. Copy the six `price_...` IDs into `.env.local`.
6. Copy Stripe secret + publishable keys.
7. Create webhook endpoint: `https://YOURDOMAIN.com/api/stripe/webhook`.
8. Subscribe the webhook to:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `checkout.session.completed`
9. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`.

## 3. OpenAI
1. Create an OpenAI API key.
2. Put it in `OPENAI_API_KEY` in `.env.local`.
3. Default image model is `gpt-image-2`.

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
- Add Stripe Customer Portal for cancellation and plan changes.
- Add webhook idempotency table to prevent duplicate top-up processing.
- Add atomic database/RPC credit deduction to eliminate race conditions under high concurrency.
- Add image moderation/validation, file-size limits, rate limiting, observability and retries.
- Store generated image URLs as signed URLs on read (current DB URL expires after 7 days).
- Add exact product-image reference inputs when retailer terms permit it.
