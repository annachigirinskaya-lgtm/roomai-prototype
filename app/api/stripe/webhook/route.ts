import { NextRequest, NextResponse } from 'next/server';
import { billingReady, getStripe, priceToPlan } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { CREDIT_PACKS, PLAN_CREDITS } from '@/lib/catalog';
import Stripe from 'stripe';

export const runtime='nodejs';

export async function POST(req:NextRequest){
  if(!billingReady())return NextResponse.json({error:'Billing is not configured.'},{status:503});
  const sig=req.headers.get('stripe-signature');
  if(!sig)return NextResponse.json({error:'Missing signature'},{status:400});
  let event:Stripe.Event;
  try{event=getStripe().webhooks.constructEvent(await req.text(),sig,process.env.STRIPE_WEBHOOK_SECRET!)}catch{return NextResponse.json({error:'Invalid signature'},{status:400})}
  const admin=createAdminClient();
  try{

  if(event.type==='customer.subscription.created'||event.type==='customer.subscription.updated'){
    const sub=event.data.object as Stripe.Subscription;
    const customer=String(sub.customer);
    const priceId=sub.items.data[0]?.price.id||'';
    const active=sub.status==='active'||sub.status==='trialing';
    const {error}=await admin.from('profiles').update({plan:active?priceToPlan(priceId):'free',stripe_subscription_id:sub.id,...(!active?{subscription_credits:0}:{})}).eq('stripe_customer_id',customer);
    if(error)throw error;
  }

  // Refill included credits on a successful initial invoice and each renewal.
  if(event.type==='invoice.paid'){
    const invoice=event.data.object as Stripe.Invoice;
    const customer=String(invoice.customer||'');
    const line=invoice.lines.data[0] as Stripe.InvoiceLineItem & {price?:{id?:string};pricing?:{price_details?:{price?:string}}};
    const priceId=line?.pricing?.price_details?.price || line?.price?.id || '';
    const plan=priceToPlan(String(priceId)) as keyof typeof PLAN_CREDITS;
    if(plan!=='free'){
      const {error}=await admin.rpc('fulfill_subscription_invoice',{p_customer_id:customer,p_invoice_id:invoice.id,p_plan:plan,p_credits:PLAN_CREDITS[plan]});
      if(error)throw error;
    }
  }

  if(event.type==='checkout.session.completed'||event.type==='checkout.session.async_payment_succeeded'){
    const session=event.data.object as Stripe.Checkout.Session;
    if(session.mode==='payment'&&session.payment_status==='paid'&&session.metadata?.kind==='credit_pack'&&session.metadata?.user_id){
      const pack=session.metadata.pack as keyof typeof CREDIT_PACKS;
      const credits=CREDIT_PACKS[pack]?.credits;
      if(!credits)throw new Error('Unknown credit pack');
      const {error}=await admin.rpc('fulfill_credit_pack',{p_user_id:session.metadata.user_id,p_customer_id:String(session.customer||''),p_session_id:session.id,p_pack:pack,p_credits:credits});
      if(error)throw error;
    }
  }

  if(event.type==='customer.subscription.deleted'){
    const sub=event.data.object as Stripe.Subscription;
    const {error}=await admin.from('profiles').update({plan:'free',stripe_subscription_id:null,subscription_credits:0}).eq('stripe_customer_id',String(sub.customer)).eq('stripe_subscription_id',sub.id);
    if(error)throw error;
  }
  return NextResponse.json({received:true});
  }catch(error){
    console.error('Stripe webhook fulfillment failed',event.id,error);
    return NextResponse.json({error:'Could not fulfill this event; Stripe should retry.'},{status:500});
  }
}
