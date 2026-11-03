import { NextRequest, NextResponse } from 'next/server';
import { refineRoomDesign, generateFromRoom } from '@/services/ai-image';
import { editorAccess } from '@/lib/design-access';
import { furnitureInstruction } from '@/lib/furniture-operation';
import { layoutInstruction } from '@/lib/layouts';
import { verifyLayoutChange } from '@/services/verify-layout';
import { STYLES } from '@/lib/catalog';
import type { ProjectInput } from '@/lib/types';
import sharp from 'sharp';

export const runtime='nodejs';
export const maxDuration=300;

const MAX_IMAGE_BYTES=20*1024*1024;
const MAX_INSTRUCTION_LENGTH=1200;
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
  const access=await editorAccess();
  if(!access.allowed)return NextResponse.json({error:access.error},{status:access.status});
  if(!process.env.OPENAI_API_KEY)return NextResponse.json({error:'OpenAI is not connected in Vercel yet.'},{status:503});
  if(rateLimited(req))return NextResponse.json({error:'Hourly editing limit reached. Please try again later.'},{status:429});
  try{
    const data=await req.formData();
    const image=data.get('image');
    const mask=data.get('mask');
    const objectReference=data.get('object_reference');
    const rawInstruction=data.get('instruction');
    const operation=String(data.get('operation')||'detail');
    if(!['detail','move','swap','layout'].includes(operation))return NextResponse.json({error:'Choose a valid editing action.'},{status:400});
    let instruction=typeof rawInstruction==='string'?rawInstruction.trim():'';
    if(operation==='move'||operation==='swap')instruction=furnitureInstruction(operation,JSON.parse(String(data.get('selection')||'null')),JSON.parse(String(data.get('destination')||'null')));
    if(!(image instanceof File))return NextResponse.json({error:'The current design image is required.'},{status:400});
    if(!instruction&&operation!=='layout')return NextResponse.json({error:'Describe the detail you want to change.'},{status:400});
    if(instruction.length>MAX_INSTRUCTION_LENGTH)return NextResponse.json({error:'Keep the change request under 1,200 characters.'},{status:400});
    if(image.size>MAX_IMAGE_BYTES)return NextResponse.json({error:'The design image must be smaller than 20 MB.'},{status:413});
    if(!['image/jpeg','image/png','image/webp'].includes(image.type))return NextResponse.json({error:'Use a JPG, PNG or WebP design image.'},{status:415});
    if(mask!==null&&!(mask instanceof File))return NextResponse.json({error:'The selected-area mask is invalid.'},{status:400});
    if(mask instanceof File&&(mask.type!=='image/png'||mask.size>MAX_IMAGE_BYTES))return NextResponse.json({error:'The selected-area mask must be a PNG smaller than 20 MB.'},{status:415});
    if(objectReference!==null&&!(objectReference instanceof File))return NextResponse.json({error:'The selected furniture reference is invalid.'},{status:400});
    if(objectReference instanceof File&&(!['image/png','image/jpeg','image/webp'].includes(objectReference.type)||objectReference.size>MAX_IMAGE_BYTES))return NextResponse.json({error:'Use a PNG, JPG or WebP furniture reference smaller than 20 MB.'},{status:415});
    const source=Buffer.from(await image.arrayBuffer());
    let output:Buffer;
    if(operation==='layout'){
      const idea=String(data.get('layout_strategy')||'');
      if(!layoutInstruction(idea))return NextResponse.json({error:'Choose a layout idea.'},{status:400});
      const project=JSON.parse(String(data.get('project')||'{}')) as ProjectInput;
      if(!STYLES.includes(project.style as never)||!Number.isFinite(Number(project.budget))||Number(project.budget)<50)return NextResponse.json({error:'Style and a budget of at least $50 are required.'},{status:400});
      const refs=data.getAll('references');
      if(refs.length>2||refs.some(file=>!(file instanceof File)||file.size>1500000||!['image/jpeg','image/png','image/webp'].includes(file.type)))return NextResponse.json({error:'Use up to two compressed room references.'},{status:400});
      instruction=layoutInstruction(idea);
      output=await generateFromRoom(source,image.type,{...project,budget:Number(project.budget),layout_mode:'rearrange',layout_strategy:idea},[],await Promise.all((refs as File[]).map(async file=>({source:Buffer.from(await file.arrayBuffer()),mime:file.type}))));
    }else output=await refineRoomDesign(
      source,
      image.type,
      instruction,
      operation==='detail'&&mask instanceof File?Buffer.from(await mask.arrayBuffer()):undefined,
      objectReference instanceof File?await sharp(Buffer.from(await objectReference.arrayBuffer())).png().toBuffer():undefined,
      operation as 'detail'|'move'|'swap',
    );
    if(operation!=='detail'){
      await verifyLayoutChange(source,image.type,output,instruction);
      return new Response(new Uint8Array(await sharp(output).jpeg({quality:90}).toBuffer()),{headers:{'content-type':'image/jpeg','cache-control':'private, no-store'}});
    }
    return new Response(new Uint8Array(output),{status:200,headers:{'content-type':'image/png','cache-control':'private, no-store'}});
  }catch(error:any){
    console.error('Design refinement failed',error);
    return NextResponse.json({error:typeof error?.message==='string'?error.message:'Could not edit this design.'},{status:500});
  }
}
