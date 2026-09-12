import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe } from '@/lib/stripe';

const priceMap={weekly:process.env.STRIPE_PRICE_WEEKLY,monthly:process.env.STRIPE_PRICE_MONTHLY,yearly:process.env.STRIPE_PRICE_YEARLY};
const packMap={pack10:process.env.STRIPE_PRICE_PACK_10,pack30:process.env.STRIPE_PRICE_PACK_30,pack100:process.env.STRIPE_PRICE_PACK_100};

export async function POST(req:NextRequest){const stripe=getStripe();
  const s=await createClient();
  const {data:{user}}=await s.auth.getUser();
  if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
  const body=await req.json() as {plan?:keyof typeof priceMap,pack?:keyof typeof packMap};
  const admin=createAdminClient();
  const {data:profile}=await admin.from('profiles').select('*').eq('id',user.id).single();
  let customer=profile?.stripe_customer_id;
  if(!customer){
    const c=await stripe.customers.create({email:user.email,metadata:{user_id:user.id}});
    customer=c.id;
    await admin.from('profiles').update({stripe_customer_id:customer}).eq('id',user.id);
  }
  const base=process.env.NEXT_PUBLIC_APP_URL||'http://localhost:3000';

  if(body.plan){
    const price=priceMap[body.plan];
    if(!price)return NextResponse.json({error:'Invalid plan or missing Stripe price ID'},{status:400});
    const session=await stripe.checkout.sessions.create({
      mode:'subscription',customer,line_items:[{price,quantity:1}],
      success_url:`${base}/dashboard?checkout=success`,cancel_url:`${base}/pricing?checkout=cancelled`,
      metadata:{user_id:user.id,kind:'subscription',plan:body.plan}
    });
    return NextResponse.json({url:session.url});
  }

  if(body.pack){
    const price=packMap[body.pack];
    if(!price)return NextResponse.json({error:'Invalid credit pack or missing Stripe price ID'},{status:400});
    const session=await stripe.checkout.sessions.create({
      mode:'payment',customer,line_items:[{price,quantity:1}],
      success_url:`${base}/dashboard?credits=added`,cancel_url:`${base}/pricing?checkout=cancelled`,
      metadata:{user_id:user.id,kind:'credit_pack',pack:body.pack}
    });
    return NextResponse.json({url:session.url});
  }

  return NextResponse.json({error:'Choose a plan or credit pack'},{status:400});
}
