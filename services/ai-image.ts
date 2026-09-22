import OpenAI, { toFile } from 'openai';
import { Product, ProjectInput } from '@/lib/types';
import { STYLE_GUIDANCE } from '@/lib/catalog';
export function designPrompt(p:ProjectInput,products:Product[]){const shopping=products.map(x=>`${x.category}: ${x.title} (${x.store}, $${x.price})`).join('; ');const signature=STYLE_GUIDANCE[p.style]||p.style;return `Edit the PROVIDED PHOTO into a complete, photorealistic, professionally designed and fully furnished ${p.room_type}. This is an image edit, not a request for a new or similar room: the output must remain unmistakably the exact same room and camera view.

NON-NEGOTIABLE ROOM FIDELITY: preserve the room geometry, dimensions, perspective, camera position, windows, doors, openings, ceiling height, flooring, kitchen footprint and other fixed architecture. Never invent a different property. Decorative wall finishes, millwork, lighting, panels, shelving and furniture may be added without changing the architecture.

DESIGN INTENSITY: make a substantial, clearly visible whole-room transformation worthy of a professional interior designer. Do not merely add a basic sofa, rug and coffee table. Build a deliberate composition with a strong focal point, layered lighting, correctly scaled furniture, window treatments, coordinated textiles, wall treatment or millwork where appropriate, art, plants and styled accessories. The room must feel finished, memorable and editorial while remaining physically buildable. Do not leave it sparse, builder-basic, generic, sterile or unfinished.

STYLE: apply one unmistakable style only: ${p.style}. Required visual signature: ${signature}. Do not drift into generic beige contemporary design and do not mix visual signatures from other catalog styles.

COLOR: ${p.color_palette}${p.custom_colors?`; requested custom colors: ${p.custom_colors}`:''}. Use this palette throughout furniture, textiles, finishes and accents with tonal depth rather than making everything one flat color.

BUDGET: target $${p.budget}; mode: ${p.budget_mode}. The budget controls the price tier and material substitutions, NOT the completeness, creativity or visual richness of the design. Use affordable look-alikes and achievable treatments when necessary instead of simplifying the design.

CLIENT REQUIREMENTS: keep these existing items visibly recognizable: ${p.keep_items||'none specified'}. Replace or add: ${p.replace_items||'all furniture, lighting, textiles, wall treatments and decor needed for a complete design'}. Additional notes: ${p.notes||'none'}. ${shopping?`Use this real-product plan as visual inspiration: ${shopping}.`:''}

Render one seamless final interior photograph with accurate scale, perspective, contact shadows and believable warm lighting. Do not return a mood board, collage, split screen, empty room, floor plan, text, captions, labels or watermarks.`}
export const IMAGE_MODEL=process.env.OPENAI_IMAGE_MODEL||'gpt-image-1.5';
export const IMAGE_SIZE='1536x1024' as const;
export const IMAGE_QUALITY='medium' as const;
export async function generateFromRoom(source:Buffer,mime:string,p:ProjectInput,products:Product[]){if(!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing');const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});const file=await toFile(source,'room',{type:mime});const res=await client.images.edit({model:IMAGE_MODEL,image:file,prompt:designPrompt(p,products),size:IMAGE_SIZE,quality:IMAGE_QUALITY});const b64=res.data?.[0]?.b64_json;if(!b64)throw new Error('No image returned');return Buffer.from(b64,'base64')}
