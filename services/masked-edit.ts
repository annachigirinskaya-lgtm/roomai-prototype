import sharp from 'sharp';

// Copy generated pixels only where the user-approved mask is transparent.
// A model's mask is guidance; this enforces preservation independently of it.
export async function preserveOutsideMask(source:Buffer,generated:Buffer,mask:Buffer){
  const original=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const {width,height}=original.info;
  const selection=await sharp(mask).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  if(selection.info.width!==width||selection.info.height!==height)throw new Error('Selection dimensions must match the original image.');
  const edited=await sharp(generated).resize(width,height,{fit:'fill'}).ensureAlpha().raw().toBuffer();
  const output=Buffer.from(original.data);
  for(let offset=0;offset<output.length;offset+=4){
    if(selection.data[offset+3]===0){
      edited.copy(output,offset,offset,offset+4);
    }
  }
  return sharp(output,{raw:{width,height,channels:4}}).png().toBuffer();
}
