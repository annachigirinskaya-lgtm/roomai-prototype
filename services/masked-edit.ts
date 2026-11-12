import sharp from 'sharp';

// Blend generated pixels only around the user-approved transparent selection.
// The soft edge avoids a pasted rectangular/polygonal seam while independently
// preserving the rest of the original image.
export async function preserveOutsideMask(source:Buffer,generated:Buffer,mask:Buffer){
  const original=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const {width,height}=original.info;
  const selection=await sharp(mask).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  if(selection.info.width!==width||selection.info.height!==height)throw new Error('Selection dimensions must match the original image.');
  const edited=await sharp(generated).resize(width,height,{fit:'fill'}).ensureAlpha().raw().toBuffer();
  const featherRadius=Math.max(1,Math.min(10,Math.round(Math.min(width,height)/240)));
  const blendMask=await sharp(mask).ensureAlpha().extractChannel('alpha').negate().blur(featherRadius).raw().toBuffer();
  const output=Buffer.from(original.data);
  for(let offset=0;offset<output.length;offset+=4){
    const weight=blendMask[offset/4]/255;
    if(weight<=0)continue;
    for(let channel=0;channel<3;channel++)output[offset+channel]=Math.round(original.data[offset+channel]*(1-weight)+edited[offset+channel]*weight);
  }
  return sharp(output,{raw:{width,height,channels:4}}).png().toBuffer();
}
