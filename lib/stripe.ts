import Stripe from 'stripe';
export function getStripe(){
  const key=process.env.STRIPE_SECRET_KEY;
  if(!key) throw new Error('STRIPE_SECRET_KEY missing');
  return new Stripe(key);
}
export const priceToPlan=(priceId:string)=>{if(priceId===process.env.STRIPE_PRICE_WEEKLY)return 'weekly';if(priceId===process.env.STRIPE_PRICE_MONTHLY)return 'monthly';if(priceId===process.env.STRIPE_PRICE_YEARLY)return 'yearly';return 'free'};
