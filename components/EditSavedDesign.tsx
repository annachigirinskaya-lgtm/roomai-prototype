'use client';

import { useState } from 'react';
import { saveLocalDesign } from '@/lib/local-designs';

export default function EditSavedDesign({imageUrl,style,name,colorPalette}:{imageUrl:string;style:string;name:string;colorPalette:string}){
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function openEditor(){
    setBusy(true);setError('');
    try{
      const response=await fetch(imageUrl);
      if(!response.ok)throw new Error('Could not open this design. Refresh the page and try again.');
      const image=await response.blob();
      const id=crypto.randomUUID();
      await saveLocalDesign({id,style,createdAt:Date.now(),project:{name,color_palette:colorPalette},image});
      window.location.assign(`/local-result?id=${encodeURIComponent(id)}`);
    }catch(reason){setError(reason instanceof Error?reason.message:'Could not open this design.');setBusy(false)}
  }
  return <div><button type="button" className="btn-primary disabled:opacity-50" disabled={busy} onClick={openEditor}>{busy?'Opening editor…':'Edit details and objects'}</button>{error&&<p className="mt-2 text-sm text-red-700">{error}</p>}</div>;
}
