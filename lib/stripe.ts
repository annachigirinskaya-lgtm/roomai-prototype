import Stripe from 'stripe';
export function billingReady(){
  return Boolean(process.env.ROOMAI_PUBLIC_BILLING_ENABLED==='true'&&process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY&&process.env.SUPABASE_SERVICE_ROLE_KEY&&process.env.STRIPE_SECRET_KEY&&process.env.STRIPE_WEBHOOK_SECRET&&process.env.STRIPE_PRICE_WEEKLY&&process.env.STRIPE_PRICE_MONTHLY&&process.env.STRIPE_PRICE_YEARLY&&process.env.STRIPE_PRICE_PACK_10&&process.env.STRIPE_PRICE_PACK_30&&process.env.STRIPE_PRICE_PACK_100&&process.env.NEXT_PUBLIC_APP_URL);
}
export function getStripe(){
  const key=process.env.STRIPE_SECRET_KEY;
  if(!key) throw new Error('STRIPE_SECRET_KEY missing');
  return new Stripe(key);
}
export const priceToPlan=(priceId:string)=>{if(priceId===process.env.STRIPE_PRICE_WEEKLY)return 'weekly';if(priceId===process.env.STRIPE_PRICE_MONTHLY)return 'monthly';if(priceId===process.env.STRIPE_PRICE_YEARLY)return 'yearly';return 'free'};
