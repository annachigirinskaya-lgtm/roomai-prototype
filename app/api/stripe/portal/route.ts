import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { billingReady, getStripe } from '@/lib/stripe';

export async function POST(){
  if(!billingReady())return NextResponse.json({error:'Billing is not available yet.'},{status:503});
  const s=await createClient();
  const {data:{user}}=await s.auth.getUser();
  if(!user)return NextResponse.json({error:'Sign in to manage billing.'},{status:401});
  const admin=createAdminClient();
  const {data:profile,error}=await admin.from('profiles').select('stripe_customer_id').eq('id',user.id).single();
  if(error||!profile?.stripe_customer_id)return NextResponse.json({error:'No billing account exists yet.'},{status:404});
  try{
    const session=await getStripe().billingPortal.sessions.create({customer:profile.stripe_customer_id,return_url:`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`});
    return NextResponse.json({url:session.url});
  }catch(error){
    console.error('Billing portal unavailable',error);
    return NextResponse.json({error:'Could not open billing management.'},{status:503});
  }
}
