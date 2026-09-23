import { NextRequest, NextResponse } from 'next/server';
import { refineRoomDesign } from '@/services/ai-image';

export const runtime='nodejs';
export const maxDuration=300;

const MAX_IMAGE_BYTES=20*1024*1024;
const MAX_INSTRUCTION_LENGTH=600;
const WINDOW_MS=60*60*1000;
const MAX_PER_WINDOW=12;
const globalRate=globalThis as unknown as {roomAiRefineRate?:Map<string,number[]>};
const rate=globalRate.roomAiRefineRate??new Map<string,number[]>();
globalRate.roomAiRefineRate=rate;

function rateLimited(req:NextRequest){
  const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
  const now=Date.now();
  const recent=(rate.get(ip)||[]).filter(t=>now-t<WINDOW_MS);
  if(recent.length>=MAX_PER_WINDOW)return true;
  recent.push(now);rate.set(ip,recent);return false;
}

export async function POST(req:NextRequest){
  if(!process.env.OPENAI_API_KEY)return NextResponse.json({error:'OpenAI is not connected in Vercel yet.'},{status:503});
  if(rateLimited(req))return NextResponse.json({error:'Hourly prototype editing limit reached. Please try again later.'},{status:429});
  try{
    const data=await req.formData();
    const image=data.get('image');
    const mask=data.get('mask');
    const rawInstruction=data.get('instruction');
    const instruction=typeof rawInstruction==='string'?rawInstruction.trim():'';
    if(!(image instanceof File))return NextResponse.json({error:'The current design image is required.'},{status:400});
    if(!instruction)return NextResponse.json({error:'Describe the detail you want to change.'},{status:400});
    if(instruction.length>MAX_INSTRUCTION_LENGTH)return NextResponse.json({error:'Keep the change request under 600 characters.'},{status:400});
    if(image.size>MAX_IMAGE_BYTES)return NextResponse.json({error:'The design image must be smaller than 20 MB.'},{status:413});
    if(!['image/jpeg','image/png','image/webp'].includes(image.type))return NextResponse.json({error:'Use a JPG, PNG or WebP design image.'},{status:415});
    if(mask!==null&&!(mask instanceof File))return NextResponse.json({error:'The selected-area mask is invalid.'},{status:400});
    if(mask instanceof File&&(mask.type!=='image/png'||mask.size>MAX_IMAGE_BYTES))return NextResponse.json({error:'The selected-area mask must be a PNG smaller than 20 MB.'},{status:415});
    const output=await refineRoomDesign(Buffer.from(await image.arrayBuffer()),image.type,instruction,mask instanceof File?Buffer.from(await mask.arrayBuffer()):undefined);
    return new Response(new Uint8Array(output),{status:200,headers:{'content-type':'image/png','cache-control':'private, no-store'}});
  }catch(error:any){
    console.error('Design refinement failed',error);
    return NextResponse.json({error:typeof error?.message==='string'?error.message:'Could not edit this design.'},{status:500});
  }
}
