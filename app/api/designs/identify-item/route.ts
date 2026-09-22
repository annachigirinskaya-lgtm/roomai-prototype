import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

export const runtime='nodejs';
export const maxDuration=60;

const MAX_IMAGE_BYTES=20*1024*1024;
const CATEGORIES=['rug','sofa','armchair','coffee table','side table','tv console','lighting','curtains','wall art','plant','wall panel','fireplace','decor'] as const;
const LABELS:Record<string,string>={rug:'Rug',sofa:'Sofa',armchair:'Armchair','coffee table':'Coffee table','side table':'Side table','tv console':'TV console',lighting:'Lighting',curtains:'Curtains','wall art':'Wall art',plant:'Plant','wall panel':'Wall panel',fireplace:'Fireplace',decor:'Decor'};

function storeLinks(query:string){
  const q=encodeURIComponent(query);
  const amazonTag=process.env.AMAZON_ASSOCIATE_TAG?`&tag=${encodeURIComponent(process.env.AMAZON_ASSOCIATE_TAG)}`:'';
  return [
    {store:'Amazon',url:`https://www.amazon.com/s?k=${q}${amazonTag}`},
    {store:'Walmart',url:`https://www.walmart.com/search?q=${q}`},
  ];
}

export async function POST(req:NextRequest){
  if(!process.env.OPENAI_API_KEY)return NextResponse.json({error:'OpenAI is not connected in Vercel yet.'},{status:503});
  try{
    const data=await req.formData();
    const image=data.get('image');
    const x=Math.max(0,Math.min(100,Number(data.get('x'))));
    const y=Math.max(0,Math.min(100,Number(data.get('y'))));
    const style=String(data.get('style')||'interior');
    const palette=String(data.get('palette')||'neutral');
    if(!(image instanceof File))return NextResponse.json({error:'The design image is required.'},{status:400});
    if(image.size>MAX_IMAGE_BYTES)return NextResponse.json({error:'The design image must be smaller than 20 MB.'},{status:413});
    if(!['image/jpeg','image/png','image/webp'].includes(image.type))return NextResponse.json({error:'Use a JPG, PNG or WebP image.'},{status:415});

    const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
    const base64=Buffer.from(await image.arrayBuffer()).toString('base64');
    const response=await client.responses.create({
      model:process.env.OPENAI_VISION_MODEL||'gpt-4.1-mini',
      input:[{role:'user',content:[
        {type:'input_text',text:`Identify the visible interior item located at ${x.toFixed(1)}% from the left and ${y.toFixed(1)}% from the top of this image. Choose exactly one category from: ${CATEGORIES.join(', ')}. Return only the category name, nothing else.`},
        {type:'input_image',image_url:`data:${image.type};base64,${base64}`,detail:'low'},
      ]}],
    });
    const raw=response.output_text.toLowerCase().trim();
    const category=CATEGORIES.find(item=>raw===item||raw.includes(item))||'decor';
    const label=LABELS[category];
    const query=`${style} ${palette} ${category} for living room`;
    return NextResponse.json({category,label,x,y,query,storeLinks:storeLinks(query),source:'visual selection'});
  }catch(error:any){
    console.error('Item identification failed',error);
    return NextResponse.json({error:typeof error?.message==='string'?error.message:'Could not identify this item.'},{status:500});
  }
}
