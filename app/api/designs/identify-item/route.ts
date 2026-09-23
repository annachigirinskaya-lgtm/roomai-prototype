import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

export const runtime='nodejs';
export const maxDuration=60;

const MAX_IMAGE_BYTES=20*1024*1024;
const CATEGORIES=['vase','flower arrangement','decorative bowl','tray','candle','books','sculpture','throw pillow','blanket','rug','sofa','sectional sofa','armchair','ottoman','pouf','bench','coffee table','side table','dining table','dining chair','bar stool','tv','tv console','soundbar','floor lamp','table lamp','ceiling light','chandelier','curtains','wall art','mirror','indoor plant','plant pot','wall panel','fireplace','shelving','cabinet','decor accessory'] as const;
function itemLabel(category:string){return category.replace(/\b\w/g,letter=>letter.toUpperCase())}

function storeLinks(query:string){
  const q=encodeURIComponent(query);
  const amazonTag=process.env.AMAZON_ASSOCIATE_TAG?`&tag=${encodeURIComponent(process.env.AMAZON_ASSOCIATE_TAG)}`:'';
  return [
    {store:'Amazon',url:`https://www.amazon.com/s?k=${q}${amazonTag}`},
    {store:'Walmart',url:`https://www.walmart.com/search?q=${q}`},
  ];
}

export async function POST(req:NextRequest){
  if(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)return NextResponse.json({error:'Prototype item selection is unavailable when account billing is enabled.'},{status:403});
  if(!process.env.OPENAI_API_KEY)return NextResponse.json({error:'OpenAI is not connected in Vercel yet.'},{status:503});
  try{
    const data=await req.formData();
    const image=data.get('image');
    const crop=data.get('crop');
    const x=Math.max(0,Math.min(100,Number(data.get('x'))));
    const y=Math.max(0,Math.min(100,Number(data.get('y'))));
    const style=String(data.get('style')||'interior');
    const palette=String(data.get('palette')||'neutral');
    if(!(image instanceof File))return NextResponse.json({error:'The design image is required.'},{status:400});
    if(!(crop instanceof File))return NextResponse.json({error:'The selected image area is required.'},{status:400});
    if(image.size>MAX_IMAGE_BYTES)return NextResponse.json({error:'The design image must be smaller than 20 MB.'},{status:413});
    if(!['image/jpeg','image/png','image/webp'].includes(image.type))return NextResponse.json({error:'Use a JPG, PNG or WebP image.'},{status:415});

    const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
    const base64=Buffer.from(await image.arrayBuffer()).toString('base64');
    const cropBase64=Buffer.from(await crop.arrayBuffer()).toString('base64');
    const response=await client.responses.create({
      model:process.env.OPENAI_VISION_MODEL||'gpt-4.1-mini',
      input:[{role:'user',content:[
        {type:'input_text',text:`The first image is the full interior. The second image is a close-up centered exactly on the user's tap at ${x.toFixed(1)}% from the left and ${y.toFixed(1)}% from the top. Identify the smallest distinct visible object at the CENTER of the close-up, not the larger furniture behind or beneath it. For example, a vase on a table must be vase, not table; flowers inside a vase may be flower arrangement. Choose exactly one category from: ${CATEGORIES.join(', ')}. Return only the category name, nothing else.`},
        {type:'input_image',image_url:`data:${image.type};base64,${base64}`,detail:'low'},
        {type:'input_image',image_url:`data:${crop.type};base64,${cropBase64}`,detail:'high'},
      ]}],
    });
    const raw=response.output_text.toLowerCase().trim();
    const category=CATEGORIES.find(item=>raw===item)||[...CATEGORIES].sort((a,b)=>b.length-a.length).find(item=>raw.includes(item))||'decor accessory';
    const label=itemLabel(category);
    const query=`${style} ${palette} ${category} for living room`;
    return NextResponse.json({category,label,x,y,query,storeLinks:storeLinks(query),source:'visual selection'});
  }catch(error:any){
    console.error('Item identification failed',error);
    return NextResponse.json({error:typeof error?.message==='string'?error.message:'Could not identify this item.'},{status:500});
  }
}
