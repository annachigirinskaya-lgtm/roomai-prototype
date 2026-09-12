import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getStripe, priceToPlan } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { CREDIT_PACKS, PLAN_CREDITS } from '@/lib/catalog';
import Stripe from 'stripe';

export async function POST(req:NextRequest){const stripe=getStripe();
  const body=await req.text();
  const sig=(await headers()).get('stripe-signature');
  if(!sig)return NextResponse.json({error:'Missing signature'},{status:400});
  let event:Stripe.Event;
  try{event=stripe.webhooks.constructEvent(body,sig,process.env.STRIPE_WEBHOOK_SECRET!)}catch{return NextResponse.json({error:'Invalid signature'},{status:400})}
  const admin=createAdminClient();

  if(event.type==='customer.subscription.created'||event.type==='customer.subscription.updated'){
    const sub=event.data.object as Stripe.Subscription;
    const customer=String(sub.customer);
    const priceId=sub.items.data[0]?.price.id||'';
    await admin.from('profiles').update({plan:priceToPlan(priceId),stripe_subscription_id:sub.id}).eq('stripe_customer_id',customer);
  }

  // Refill included credits on a successful initial invoice and each renewal.
  if(event.type==='invoice.paid'){
    const invoice=event.data.object as Stripe.Invoice;
    const customer=String(invoice.customer||'');
    const line:any=invoice.lines.data[0];
    const priceId=line?.pricing?.price_details?.price || line?.price?.id || '';
    const plan=priceToPlan(String(priceId)) as keyof typeof PLAN_CREDITS;
    if(plan!=='free'){
      await admin.from('profiles').update({plan,subscription_credits:PLAN_CREDITS[plan],period_started_at:new Date().toISOString()}).eq('stripe_customer_id',customer);
    }
  }

  if(event.type==='checkout.session.completed'){
    const session=event.data.object as Stripe.Checkout.Session;
    if(session.mode==='payment'&&session.metadata?.kind==='credit_pack'&&session.metadata?.user_id){
      const pack=session.metadata.pack as keyof typeof CREDIT_PACKS;
      const credits=CREDIT_PACKS[pack]?.credits;
      if(credits){
        const {data:profile}=await admin.from('profiles').select('purchased_credits').eq('id',session.metadata.user_id).single();
        await admin.from('profiles').update({purchased_credits:(profile?.purchased_credits||0)+credits}).eq('id',session.metadata.user_id);
        await admin.from('credit_transactions').insert({user_id:session.metadata.user_id,amount:credits,kind:'topup',stripe_session_id:session.id,note:`Purchased ${pack}`});
      }
    }
  }

  if(event.type==='customer.subscription.deleted'){
    const sub=event.data.object as Stripe.Subscription;
    await admin.from('profiles').update({plan:'free',stripe_subscription_id:null,subscription_credits:PLAN_CREDITS.free}).eq('stripe_customer_id',String(sub.customer));
  }
  return NextResponse.json({received:true});
}
