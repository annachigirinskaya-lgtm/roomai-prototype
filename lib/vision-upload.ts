// Keep visual-analysis requests well below the hosting request-body limit.
// The saved full-resolution design is never modified.
export const MAX_VISION_UPLOAD_BYTES=1500000;

export async function prepareVisionUpload(source:Blob):Promise<Blob>{
  if(!(source instanceof Blob)||!source.size)throw new Error('The saved room photo could not be read. Reopen the design and try again.');
  const url=URL.createObjectURL(source);
  const image=new Image();
  try{
    await new Promise<void>((resolve,reject)=>{
      image.onload=()=>resolve();
      image.onerror=()=>reject(new Error('The room photo could not be opened. Reopen the design and try again.'));
      image.src=url;
    });
    if(!image.naturalWidth||!image.naturalHeight)throw new Error('The room photo has no readable dimensions.');
    const scale=Math.min(1,1280/Math.max(image.naturalWidth,image.naturalHeight));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
    canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    const context=canvas.getContext('2d');
    if(!context)throw new Error('This browser could not prepare the photo. Open this page in Safari and try again.');
    context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
    context.drawImage(image,0,0,canvas.width,canvas.height);
    for(const quality of [.82,.64,.45]){
      const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
      if(blob?.size&&blob.size<=MAX_VISION_UPLOAD_BYTES)return blob;
    }
    throw new Error('The photo is too large for product search. Please use a smaller room photo.');
  }finally{
    image.onload=null;image.onerror=null;URL.revokeObjectURL(url);
  }
}
