'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getLocalDesign, type LocalDesign } from '@/lib/local-designs';

export default function LocalResultPage(){
  const [design,setDesign]=useState<LocalDesign>();
  const [url,setUrl]=useState('');
  const [error,setError]=useState('');
  useEffect(()=>{let objectUrl='';const id=new URLSearchParams(window.location.search).get('id')||'';getLocalDesign(id).then(item=>{if(!item){setError('This saved design was not found on this device.');return}objectUrl=URL.createObjectURL(item.image);setDesign(item);setUrl(objectUrl)}).catch(()=>setError('Could not open the saved design.'));return()=>{if(objectUrl)URL.revokeObjectURL(objectUrl)}},[]);
  if(error)return <section className="card p-8"><h1 className="text-3xl font-semibold">Saved design</h1><p className="mt-3 text-red-700">{error}</p><Link href="/new-project" className="btn-primary inline-block mt-6">Create another</Link></section>;
  if(!design||!url)return <div className="card p-8">Opening your saved AI design…</div>;
  const project=design.project as any;
  return <div className="space-y-6"><section className="card overflow-hidden"><div className="p-6 md:p-8"><div className="kicker">Saved on this device · AI-generated</div><h1 className="text-3xl md:text-5xl font-semibold mt-2">{project.name||'My room'}</h1><p className="text-stone-600 mt-3">{design.style} · {project.color_palette||'Selected palette'}</p></div><img src={url} alt={`AI-generated ${design.style} design of the uploaded room`} className="w-full object-cover"/></section><div className="grid sm:grid-cols-2 gap-3"><a href={url} download={`roomai-${design.style.toLowerCase().replaceAll(' ','-')}.png`} className="btn-primary text-center">Save image to iPhone</a><Link href="/new-project" className="btn-soft text-center">Create another design</Link></div></div>;
}
