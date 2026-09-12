import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export async function POST(req:NextRequest){const s=await createClient();const {data:{user}}=await s.auth.getUser();const {productId,store}=await req.json();await s.from('affiliate_clicks').insert({user_id:user?.id||null,design_product_id:productId||null,store:store||'unknown'});return NextResponse.json({ok:true})}
