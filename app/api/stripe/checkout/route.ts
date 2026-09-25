import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { billingReady, getStripe } from '@/lib/stripe';

const priceMap={weekly:process.env.STRIPE_PRICE_WEEKLY,monthly:process.env.STRIPE_PRICE_MONTHLY,yearly:process.env.STRIPE_PRICE_YEARLY};
const packMap={pack10:process.env.STRIPE_PRICE_PACK_10,pack30:process.env.STRIPE_PRICE_PACK_30,pack100:process.env.STRIPE_PRICE_PACK_100};

export async function POST(req:NextRequest){
  if(!billingReady())return NextResponse.json({error:'Payments are not available yet.'},{status:503});
  const s=await createClient();
  const {data:{user}}=await s.auth.getUser();
  if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
  const body=await req.json().catch(()=>({})) as {plan?:string,pack?:string};
  if(Boolean(body.plan)===Boolean(body.pack))return NextResponse.json({error:'Choose exactly one plan or credit pack.'},{status:400});
  const plan=body.plan&&Object.hasOwn(priceMap,body.plan)?body.plan as keyof typeof priceMap:undefined;
  const pack=body.pack&&Object.hasOwn(packMap,body.pack)?body.pack as keyof typeof packMap:undefined;
  if(!plan&&!pack)return NextResponse.json({error:'Invalid plan or credit pack.'},{status:400});
  const stripe=getStripe();
  const admin=createAdminClient();
  const {data:profile,error:profileError}=await admin.from('profiles').select('stripe_customer_id,stripe_subscription_id,plan').eq('id',user.id).single();
  if(profileError||!profile)return NextResponse.json({error:'Billing profile unavailable. Please try again later.'},{status:503});
  if(plan&&profile.stripe_subscription_id&&profile.plan!=='free')return NextResponse.json({error:'You already have a plan. Use Manage billing to change or cancel it.'},{status:409});
  let customer=profile?.stripe_customer_id;
  if(!customer){
    const c=await stripe.customers.create({email:user.email,metadata:{user_id:user.id}});
    customer=c.id;
    const {error:updateError}=await admin.from('profiles').update({stripe_customer_id:customer}).eq('id',user.id);
    if(updateError)return NextResponse.json({error:'Could not prepare your billing account.'},{status:503});
  }
  const base=process.env.NEXT_PUBLIC_APP_URL!;

  if(plan){
    const price=priceMap[plan]!;
    const configured=await stripe.prices.retrieve(price);
    const expected={weekly:{amount:699,interval:'week'},monthly:{amount:1499,interval:'month'},yearly:{amount:5999,interval:'year'}}[plan];
    if(!configured.active||configured.currency!=='usd'||configured.unit_amount!==expected.amount||configured.recurring?.interval!==expected.interval||configured.recurring.interval_count!==1)return NextResponse.json({error:'Plan price configuration needs review.'},{status:503});
    const session=await stripe.checkout.sessions.create({
      mode:'subscription',customer,line_items:[{price,quantity:1}],
      success_url:`${base}/dashboard?checkout=success`,cancel_url:`${base}/pricing?checkout=cancelled`,
      metadata:{user_id:user.id,kind:'subscription',plan}
    });
    return NextResponse.json({url:session.url});
  }

  if(pack){
    const price=packMap[pack];
    if(!price)return NextResponse.json({error:'Credit packs are not available yet.'},{status:503});
    const configured=await stripe.prices.retrieve(price);
    const expected={pack10:499,pack30:999,pack100:2499}[pack];
    if(!configured.active||configured.currency!=='usd'||configured.unit_amount!==expected||configured.type!=='one_time')return NextResponse.json({error:'Credit pack price configuration needs review.'},{status:503});
    const session=await stripe.checkout.sessions.create({
      mode:'payment',customer,line_items:[{price,quantity:1}],
      success_url:`${base}/dashboard?credits=added`,cancel_url:`${base}/pricing?checkout=cancelled`,
      metadata:{user_id:user.id,kind:'credit_pack',pack}
    });
    return NextResponse.json({url:session.url});
  }

  return NextResponse.json({error:'Choose a plan or credit pack'},{status:400});
}
