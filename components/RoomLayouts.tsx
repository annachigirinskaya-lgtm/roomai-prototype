'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { LAYOUT_IDEAS } from '@/lib/layouts';
import { prepareVisionUpload } from '@/lib/vision-upload';
import { saveLocalDesign, type LocalDesign } from '@/lib/local-designs';

type Result={id:string;url:string;label:string};
export default function RoomLayouts({design,onUpdate}:{design:LocalDesign;onUpdate:(design:LocalDesign)=>void}){
  const [busy,setBusy]=useState('');
  const [results,setResults]=useState<Record<string,Result>>({});
  const [errors,setErrors]=useState<Record<string,string>>({});
  const [preparing,setPreparing]=useState(false);
  const urls=useRef<string[]>([]);
  useEffect(()=>()=>urls.current.forEach(url=>URL.revokeObjectURL(url)),[]);

  async function attachPhotos(files:File[]){
    if(!files.length)return;
    setPreparing(true);setErrors({});
    try{
      const photos=await Promise.all(files.slice(0,3).map(file=>prepareVisionUpload(file,{maxBytes:1000000,maxSide:1120})));
      const next={...design,sourcePhotos:photos};await saveLocalDesign(next);onUpdate(next);
    }catch{setErrors({photos:'Could not save these room photos. Try JPG, PNG or WebP.'})}
    finally{setPreparing(false)}
  }
  async function generate(ids:string[]){
    if(busy||preparing)return;
    const source=design.sourcePhotos?.[0]||design.image;
    for(const id of ids){
      const idea=LAYOUT_IDEAS.find(idea=>idea.id===id);if(!idea)continue;
      setBusy(id);setErrors(current=>({...current,[id]:''}));
      try{
        const photos=await Promise.all([source,...(design.sourcePhotos?.slice(1,3)||[])].map(photo=>prepareVisionUpload(photo,{maxBytes:1000000,maxSide:1120})));
        const form=new FormData();form.append('image',photos[0],'room.jpg');photos.slice(1).forEach(photo=>form.append('references',photo,'room-reference.jpg'));
        form.append('operation','layout');form.append('layout_strategy',id);
        form.append('project',JSON.stringify({...design.project,style:design.style,layout_mode:'rearrange',layout_strategy:id}));
        const response=await fetch('/api/designs/refine',{method:'POST',body:form});
        if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||`Layout request failed (${response.status}). Please try one layout at a time.`)}
        if(!response.headers.get('content-type')?.startsWith('image/'))throw new Error('The layout was not returned. Reopen your invitation link and try again.');
        const image=await response.blob();const newId=crypto.randomUUID();
        await saveLocalDesign({...design,id:newId,image,shopping:undefined,createdAt:Date.now(),parentId:design.id,rootId:design.rootId||design.id,project:{...design.project,layout_mode:'rearrange',layout_strategy:id},editInstruction:idea.label});
        const url=URL.createObjectURL(image);urls.current.push(url);setResults(current=>({...current,[id]:{id:newId,url,label:idea.label}}));
      }catch(error){setErrors(current=>({...current,[id]:error instanceof Error?error.message:'Could not create this layout.'}))}
    }
    setBusy('');
  }
  return <section id="room-layouts" className="card p-5 md:p-8 scroll-mt-4">
    <h2 className="text-2xl font-bold">Explore new layouts</h2>
    <p className="mt-2 text-stone-600">Different furniture positions in the same room: move the bed, desk and storage while keeping doors, windows and walls.</p>
    {!design.sourcePhotos?.length&&<div className="mt-4 rounded-2xl bg-stone-100 p-4"><p className="text-sm">This older design has no saved original photos. You can use the displayed design, or add your original room photos for better layout references.</p><label className="mt-3 block text-sm font-semibold">Add original room photos (up to 3)<input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={!!busy||preparing} onChange={event=>void attachPhotos(Array.from(event.target.files||[]))} className="mt-2 block w-full"/></label></div>}
    {!!design.sourcePhotos?.length&&<p className="mt-3 text-sm text-stone-600">Using {design.sourcePhotos.length} original room photo(s) as references.</p>}
    {errors.photos&&<p role="alert" className="mt-3 text-sm text-red-700">{errors.photos}</p>}
    <button type="button" className="btn-primary mt-5 w-full disabled:opacity-50" disabled={!!busy||preparing} onClick={()=>void generate(LAYOUT_IDEAS.map(idea=>idea.id))}>{busy?'Creating layout ideas…':preparing?'Preparing photos…':'Generate 4 different layouts'}</button>
    <p className="mt-2 text-xs text-stone-500">Each layout creates one new image. Completed results are saved separately on this device.</p>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">{LAYOUT_IDEAS.map(idea=><article key={idea.id} className="rounded-2xl border p-4"><h3 className="font-bold">{idea.label}</h3>{results[idea.id]&&<Link href={`/local-result?id=${encodeURIComponent(results[idea.id].id)}`}><img src={results[idea.id].url} alt={idea.label} className="mt-3 aspect-[4/3] w-full rounded-xl object-cover"/><span className="mt-2 block text-sm underline">Open this layout</span></Link>}<button type="button" disabled={!!busy||preparing} onClick={()=>void generate([idea.id])} className="btn-soft mt-3 w-full disabled:opacity-50">{busy===idea.id?'Generating & checking…':results[idea.id]?'Try another version':'Generate this layout'}</button>{errors[idea.id]&&<p role="alert" className="mt-2 text-sm text-red-700">{errors[idea.id]}</p>}</article>)}</div>
  </section>;
}
