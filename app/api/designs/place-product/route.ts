import { NextRequest, NextResponse } from 'next/server';
import { placeProductInRoom } from '@/services/ai-image';

export const runtime='nodejs';
export const maxDuration=300;

const MAX_ROOM_BYTES=20*1024*1024;
const MAX_PRODUCT_BYTES=12*1024*1024;
const IMAGE_TYPES=['image/jpeg','image/png','image/webp'];

export async function POST(req:NextRequest){
  if(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)return NextResponse.json({error:'Prototype product edits are unavailable when account billing is enabled.'},{status:403});
  if(!process.env.OPENAI_API_KEY)return NextResponse.json({error:'OpenAI is not connected in Vercel yet.'},{status:503});
  try{
    const data=await req.formData();
    const room=data.get('room');
    const product=data.get('product');
    const category=String(data.get('category')||'decor item').slice(0,80);
    const x=Math.max(0,Math.min(100,Number(data.get('x'))));
    const y=Math.max(0,Math.min(100,Number(data.get('y'))));
    if(!(room instanceof File)||!(product instanceof File))return NextResponse.json({error:'Room design and product photo are required.'},{status:400});
    if(room.size>MAX_ROOM_BYTES||product.size>MAX_PRODUCT_BYTES)return NextResponse.json({error:'The selected images are too large.'},{status:413});
    if(!IMAGE_TYPES.includes(room.type)||!IMAGE_TYPES.includes(product.type))return NextResponse.json({error:'Use JPG, PNG or WebP images.'},{status:415});
    const output=await placeProductInRoom(Buffer.from(await room.arrayBuffer()),room.type,Buffer.from(await product.arrayBuffer()),product.type,category,x,y);
    return new Response(new Uint8Array(output),{status:200,headers:{'content-type':'image/png','cache-control':'private, no-store'}});
  }catch(error:any){
    console.error('Product placement failed',error);
    return NextResponse.json({error:typeof error?.message==='string'?error.message:'Could not place this product in the room.'},{status:500});
  }
}
