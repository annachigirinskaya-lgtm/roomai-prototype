import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { editorAccess } from '@/lib/design-access';
import { findRoomProducts, shoppingFailure } from '@/services/room-products';

export const runtime='nodejs';
export const maxDuration=180;
const state=globalThis as typeof globalThis&{roomAiShoppingRate?:Map<string,number[]>};
const rate:Map<string,number[]>=state.roomAiShoppingRate??=new Map<string,number[]>();

export async function POST(req:NextRequest){
  const access=await editorAccess();
  if(!access.allowed)return NextResponse.json({error:access.error},{status:access.status});
  if(!process.env.OPENAI_API_KEY)return NextResponse.json({error:'Product search is not connected yet.'},{status:503});
  try{
    const form=await req.formData();
    const image=form.get('image');
    if(!(image instanceof File)||!['image/png','image/jpeg','image/webp'].includes(image.type))return NextResponse.json({error:'Upload a room image.'},{status:400});
    if(image.size>20*1024*1024)return NextResponse.json({error:'The room image is too large.'},{status:413});
    const budget=Number(form.get('budget'));
    if(!Number.isFinite(budget)||budget<0||budget>1000000)return NextResponse.json({error:'Enter a valid budget.'},{status:400});
    const item=String(form.get('category')||'').slice(0,80);
    const x=Number(form.get('x')),y=Number(form.get('y'));
    if(item&&(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>100||y<0||y>100))return NextResponse.json({error:'Select an item in the room.'},{status:400});
    const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
    const now=Date.now();
    for(const [key,hits]of rate)if(hits.every(time=>now-time>=3600000))rate.delete(key);
    const hits=(rate.get(ip)||[]).filter(time=>now-time<3600000);
    if(hits.length>=6)return NextResponse.json({error:'Shopping search limit reached. Your saved prices are still available. Try again in an hour.'},{status:429});
    rate.set(ip,[...hits,now]);
    const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY,timeout:45000,maxRetries:0});
    const result=await findRoomProducts(client,{
      imageUrl:`data:${image.type};base64,${Buffer.from(await image.arrayBuffer()).toString('base64')}`,
      style:String(form.get('style')||'').slice(0,80),budget,
      keep:String(form.get('keep')||'').slice(0,500),category:item,x,y,
    });
    return NextResponse.json(result,{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){
    const failure=shoppingFailure(error);
    console.error('Shopping match failed',{code:failure.code,status:(error as {status?:number})?.status,param:(error as {param?:string})?.param});
    return NextResponse.json({error:failure.message,code:failure.code},{status:502});
  }
}
