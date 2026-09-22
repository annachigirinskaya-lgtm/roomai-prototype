import OpenAI, { toFile } from 'openai';
import { Product, ProjectInput } from '@/lib/types';
import { STYLE_GUIDANCE } from '@/lib/catalog';
export function designPrompt(p:ProjectInput,products:Product[]){const shopping=products.map(x=>`${x.category}: ${x.title} (${x.store}, $${x.price})`).join('; ');const signature=STYLE_GUIDANCE[p.style]||p.style;return `Edit the PROVIDED PHOTO into a complete, photorealistic, professionally designed and fully furnished ${p.room_type}. This is an image edit, not a request for a new or similar room: the output must remain unmistakably the exact same room and camera view.

NON-NEGOTIABLE ROOM FIDELITY: before designing, inspect and internally inventory every visible structural element in the source photo. Reproduce every hinged door, sliding door, doorway, passage, window, balcony opening, column, vent, switch, outlet, ceiling edge, floor boundary, kitchen cabinet, countertop and fixed fixture one-for-one in the identical position, size and perspective. Preserve the exact room geometry, dimensions, wall lengths, camera position, field of view, ceiling height, flooring and kitchen footprint. The before and after images must align if overlaid. Never remove, cover, narrow, move, resize or replace an existing door, doorway, window, balcony opening or kitchen element. Never build a feature wall, marble slab, panel, cabinet, fireplace, television or furniture across an opening. Use only genuinely solid wall areas for wall treatments and place furniture within the existing free floor area. Never invent a different property.

DESIGN INTENSITY: make a substantial, clearly visible whole-room transformation worthy of a professional interior designer. Do not merely add a basic sofa, rug and coffee table. Build a deliberate composition with a strong focal point, layered lighting, correctly scaled furniture, window treatments, coordinated textiles, wall treatment or millwork where appropriate, art, plants and styled accessories. The room must feel finished, memorable and editorial while remaining physically buildable. Do not leave it sparse, builder-basic, generic, sterile or unfinished.

STYLE: apply one unmistakable style only: ${p.style}. Required visual signature: ${signature}. Do not drift into generic beige contemporary design and do not mix visual signatures from other catalog styles.

LIVING ROOM FUNCTION: if this is a living room, the finished design must include a clearly visible, realistically sized television and an intentional media composition unless the client explicitly asks for no TV. Place it only on an existing uninterrupted solid wall that can physically fit it. Integrate its surround, console and lighting into the selected style without covering, moving or narrowing any door, doorway, window or balcony opening.

COLOR: ${p.color_palette}${p.custom_colors?`; requested custom colors: ${p.custom_colors}`:''}. Use this palette throughout furniture, textiles, finishes and accents with tonal depth rather than making everything one flat color.

BUDGET: target $${p.budget}; mode: ${p.budget_mode}. The budget controls the price tier and material substitutions, NOT the completeness, creativity or visual richness of the design. Use affordable look-alikes and achievable treatments when necessary instead of simplifying the design.

CLIENT REQUIREMENTS: keep these existing items visibly recognizable: ${p.keep_items||'none specified'}. Replace or add: ${p.replace_items||'all furniture, lighting, textiles, wall treatments and decor needed for a complete design'}. Additional notes: ${p.notes||'none'}. ${shopping?`Use this real-product plan as visual inspiration: ${shopping}.`:''}

FINAL ARCHITECTURE CHECK: compare the proposed result against the source photo before rendering. If the count, position or dimensions of any door, doorway, window, balcony opening, column, kitchen counter or fixed element differ, correct the design. Style the room around the architecture; never redesign the architecture itself.

Render one seamless final interior photograph with accurate scale, perspective, contact shadows and believable warm lighting. Do not return a mood board, collage, split screen, empty room, floor plan, text, captions, labels or watermarks.`}
export const IMAGE_MODEL=process.env.OPENAI_IMAGE_MODEL||'gpt-image-2';
export const IMAGE_SIZE='source-aspect';
export const IMAGE_QUALITY='medium' as const;

function sourceDimensions(source:Buffer,mime:string){
  if(mime==='image/png'&&source.length>=24)return {width:source.readUInt32BE(16),height:source.readUInt32BE(20)};
  if(mime==='image/jpeg'){
    let offset=2;
    while(offset+9<source.length){
      if(source[offset]!==0xff){offset++;continue}
      const marker=source[offset+1];
      if(marker===0xd8||marker===0xd9){offset+=2;continue}
      const length=source.readUInt16BE(offset+2);
      if(length<2)break;
      if(marker>=0xc0&&marker<=0xc3)return {height:source.readUInt16BE(offset+5),width:source.readUInt16BE(offset+7)};
      offset+=2+length;
    }
  }
  return null;
}

function outputSize(source:Buffer,mime:string,model:string){
  const dimensions=sourceDimensions(source,mime);
  if(!dimensions)return '1536x1024';
  const {width,height}=dimensions;
  if(!model.startsWith('gpt-image-2')){
    const ratio=width/height;
    return ratio>1.15?'1536x1024':ratio<0.87?'1024x1536':'1024x1024';
  }
  const scale=1536/Math.max(width,height);
  let targetWidth=Math.max(16,Math.round(width*scale/16)*16);
  let targetHeight=Math.max(16,Math.round(height*scale/16)*16);
  const minimumPixels=655360;
  if(targetWidth*targetHeight<minimumPixels){
    const boost=Math.sqrt(minimumPixels/(targetWidth*targetHeight));
    targetWidth=Math.ceil(targetWidth*boost/16)*16;
    targetHeight=Math.ceil(targetHeight*boost/16)*16;
  }
  return `${targetWidth}x${targetHeight}`;
}

export async function generateFromRoom(source:Buffer,mime:string,p:ProjectInput,products:Product[]){
  if(!process.env.OPENAI_API_KEY)throw new Error('OPENAI_API_KEY missing');
  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const file=await toFile(source,'room',{type:mime});
  const res=await client.images.edit({
    model:IMAGE_MODEL,
    image:file,
    prompt:designPrompt(p,products),
    size:outputSize(source,mime,IMAGE_MODEL),
    quality:IMAGE_QUALITY,
    ...(IMAGE_MODEL.startsWith('gpt-image-2')?{}:{input_fidelity:'high' as const}),
  });
  const b64=res.data?.[0]?.b64_json;
  if(!b64)throw new Error('No image returned');
  return Buffer.from(b64,'base64');
}

export function refinementPrompt(instruction:string){
  return `Edit the PROVIDED INTERIOR DESIGN IMAGE. This is a precise revision of the same image, not a new room design.

REQUESTED CHANGE: ${instruction}

NON-NEGOTIABLE: make only the requested change. Preserve the exact camera position, crop, perspective, room dimensions, ceiling, floor, lighting direction and the position and size of every door, doorway, passage, window, balcony opening, column, vent, switch, outlet, kitchen cabinet, countertop and fixed fixture. Keep all furniture, decor, materials and colors unchanged unless the request explicitly names them. Never close, cover, move, narrow, resize or invent an architectural opening. Never move a wall or redesign the room layout.

If the request concerns a wall panel, feature wall, marble, slats, millwork or fireplace, resize or replace that finish only within the existing uninterrupted solid wall area. Leave the remainder as a realistic finished wall matching the room, and do not extend any treatment across a door, doorway, window or balcony opening.

Return one seamless photorealistic interior photograph at the same aspect ratio, with no text, labels, arrows, dimensions, before/after split, collage or watermark.`;
}

export async function refineRoomDesign(source:Buffer,mime:string,instruction:string){
  if(!process.env.OPENAI_API_KEY)throw new Error('OPENAI_API_KEY missing');
  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const file=await toFile(source,'design',{type:mime});
  const res=await client.images.edit({
    model:IMAGE_MODEL,
    image:file,
    prompt:refinementPrompt(instruction),
    size:outputSize(source,mime,IMAGE_MODEL),
    quality:IMAGE_QUALITY,
    ...(IMAGE_MODEL.startsWith('gpt-image-2')?{}:{input_fidelity:'high' as const}),
  });
  const b64=res.data?.[0]?.b64_json;
  if(!b64)throw new Error('No revised image returned');
  return Buffer.from(b64,'base64');
}
