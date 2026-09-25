import { NextRequest, NextResponse } from 'next/server';
import { generateFromRoom } from '@/services/ai-image';
import { STYLES } from '@/lib/catalog';
import type { ProjectInput } from '@/lib/types';

export const runtime='nodejs';
export const maxDuration=300;

const MAX_IMAGE_BYTES=20*1024*1024;
const WINDOW_MS=60*60*1000;
const MAX_PER_WINDOW=12;
const globalRate=globalThis as unknown as {roomAiRate?:Map<string,number[]>};
const rate=globalRate.roomAiRate??new Map<string,number[]>();
globalRate.roomAiRate=rate;

function rateLimited(req:NextRequest){
  const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
  const now=Date.now();
  const recent=(rate.get(ip)||[]).filter(t=>now-t<WINDOW_MS);
  if(recent.length>=MAX_PER_WINDOW)return true;
  recent.push(now);rate.set(ip,recent);return false;
}

export async function POST(req:NextRequest){
  const protectedBeta=process.env.NEXT_PUBLIC_ROOMAI_BETA_MODE==='true';
  const previewBeta=process.env.VERCEL_ENV==='preview';
  if(protectedBeta){
    const expectedToken=process.env.ROOMAI_BETA_ACCESS_TOKEN;
    if(!expectedToken)return NextResponse.json({error:'Private beta access is not configured yet.'},{status:503});
    if(req.headers.get('x-roomai-beta-token')!==expectedToken)return NextResponse.json({error:'This private beta link is not valid. Ask for a new invitation link.'},{status:401});
  }else if(!previewBeta&&process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY){
    return NextResponse.json({error:'Please sign in and use your account credits to generate designs.'},{status:403});
  }
  if(!process.env.OPENAI_API_KEY)return NextResponse.json({error:'OpenAI is not connected in Vercel yet. Add OPENAI_API_KEY in Environment Variables and redeploy.'},{status:503});
  if(rateLimited(req))return NextResponse.json({error:'Hourly prototype generation limit reached. Please try again later.'},{status:429});
  try{
    const data=await req.formData();
    const image=data.get('image');
    const raw=data.get('project');
    if(!(image instanceof File)||typeof raw!=='string')return NextResponse.json({error:'Room photo and project settings are required.'},{status:400});
    if(image.size>MAX_IMAGE_BYTES)return NextResponse.json({error:'The photo must be smaller than 20 MB.'},{status:413});
    if(!['image/jpeg','image/png','image/webp'].includes(image.type))return NextResponse.json({error:'Use a JPG, PNG or WebP room photo.'},{status:415});
    const parsed=JSON.parse(raw) as ProjectInput;
    if(!STYLES.includes(parsed.style as never))return NextResponse.json({error:'Choose a valid interior style.'},{status:400});
    const project:ProjectInput={...parsed,budget:Number(parsed.budget)||1500,source_image_url:''};
    const comparisonStyles=typeof data.get('comparisonStyles')==='string'?JSON.parse(data.get('comparisonStyles') as string):[];
    const output=await generateFromRoom(Buffer.from(await image.arrayBuffer()),image.type,project,[],Array.isArray(comparisonStyles)?comparisonStyles.filter((s:unknown)=>typeof s==='string'&&STYLES.includes(s as never)).slice(0,6):[]);
    return new Response(new Uint8Array(output),{status:200,headers:{'content-type':'image/png','cache-control':'private, no-store','x-roomai-style':encodeURIComponent(project.style)}});
  }catch(error:any){
    console.error('Quick generation failed',error);
    return NextResponse.json({error:typeof error?.message==='string'?error.message:'Could not generate this design.'},{status:500});
  }
}
