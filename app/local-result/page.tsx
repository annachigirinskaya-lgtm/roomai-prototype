'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { getLocalDesign, saveLocalDesign, type LocalDesign } from '@/lib/local-designs';

const PANEL_LAYOUTS=[
  {label:'Full wall',value:'Keep the wooden wall panel across the full available solid wall behind the TV. Refine it so it looks intentional and premium. Do not change anything else.'},
  {label:'Left half',value:'Make the wooden wall panel cover only the left half of its current solid wall area. Restore the right half as a clean finished wall matching the room. Keep the TV and fireplace composition functional and change nothing else.'},
  {label:'Right half',value:'Make the wooden wall panel cover only the right half of its current solid wall area. Restore the left half as a clean finished wall matching the room. Keep the TV and fireplace composition functional and change nothing else.'},
  {label:'Centered',value:'Make the wooden wall panel a narrower centered vertical feature behind the TV, with equal clean finished wall visible on both sides. Keep all other details unchanged.'},
  {label:'On both sides',value:'Place the wooden slat panels as two narrow vertical sections on the left and right sides of the TV composition, leaving the center as a refined plain or stone-finish TV panel. Keep all other details unchanged.'},
  {label:'Asymmetric curve',value:'Redesign only the TV wall treatment as a fashionable asymmetrical composition: a partial wooden slat panel on one side and a softly curved or flowing plaster edge with subtle integrated warm LED light. Keep it elegant, buildable and limited to the existing solid wall. Change nothing else.'},
];

const DETAIL_EDITS=[
  {label:'Replace sofa',value:'Replace only the sofa with a more elegant, comfortable designer sofa that matches this style. Keep its location and suitable scale. Change nothing else.'},
  {label:'Replace chandelier',value:'Replace only the main ceiling light with a statement chandelier that matches this style. Keep the ceiling and all other details unchanged.'},
  {label:'Change accent color',value:'Change only the accent color in pillows, throws and small decor. Preserve all architecture, furniture shapes, materials and layout.'},
];

export default function LocalResultPage(){
  const [design,setDesign]=useState<LocalDesign>();
  const [url,setUrl]=useState('');
  const [error,setError]=useState('');
  const [instruction,setInstruction]=useState('');
  const [selectedPreset,setSelectedPreset]=useState('');
  const [editing,setEditing]=useState(false);
  const [editError,setEditError]=useState('');

  useEffect(()=>{
    let objectUrl='';
    const id=new URLSearchParams(window.location.search).get('id')||'';
    getLocalDesign(id).then(item=>{
      if(!item){setError('This saved design was not found on this device.');return}
      objectUrl=URL.createObjectURL(item.image);setDesign(item);setUrl(objectUrl);
    }).catch(()=>setError('Could not open the saved design.'));
    return()=>{if(objectUrl)URL.revokeObjectURL(objectUrl)};
  },[]);

  function choosePreset(label:string,value:string){
    setSelectedPreset(label);
    setInstruction(value);
    setEditError('');
  }

  async function submitEdit(event:FormEvent){
    event.preventDefault();
    if(!design||!instruction.trim()||editing)return;
    setEditing(true);setEditError('');
    try{
      const form=new FormData();
      form.append('image',design.image,'current-design.png');
      form.append('instruction',instruction.trim());
      const response=await fetch('/api/designs/refine',{method:'POST',body:form});
      if(!response.ok){
        const message=await response.json().catch(()=>({}));
        throw new Error(message.error||'Could not edit this design.');
      }
      const revised=await response.blob();
      const id=crypto.randomUUID();
      await saveLocalDesign({...design,id,createdAt:Date.now(),image:revised,parentId:design.id,editInstruction:selectedPreset||instruction.trim()});
      window.location.assign(`/local-result?id=${encodeURIComponent(id)}`);
    }catch(reason){
      setEditError(reason instanceof Error?reason.message:'Could not edit this design.');
      setEditing(false);
    }
  }

  if(error)return <section className="card p-8"><h1 className="text-3xl font-semibold">Saved design</h1><p className="mt-3 text-red-700">{error}</p><Link href="/new-project" className="btn-primary inline-block mt-6">Create another</Link></section>;
  if(!design||!url)return <div className="card p-8">Opening your saved AI design…</div>;
  const project=design.project as {name?:string;color_palette?:string};

  return <div className="space-y-6">
    <section className="card overflow-hidden">
      <div className="p-6 md:p-8">
        <div className="kicker">Saved on this device · AI-generated</div>
        <h1 className="text-3xl md:text-5xl font-semibold mt-2">{project.name||'My room'}</h1>
        <p className="text-stone-600 mt-3">{design.style} · {project.color_palette||'Selected palette'}</p>
        {design.editInstruction&&<p className="mt-3 text-sm text-stone-500">Edited version: {design.editInstruction}</p>}
      </div>
      <img src={url} alt={`AI-generated ${design.style} design of the uploaded room`} className="w-full object-cover"/>
    </section>

    <section className="card p-6 md:p-8">
      <div className="kicker">Edit this exact design</div>
      <h2 className="text-2xl md:text-3xl font-semibold mt-2">Change interior details</h2>
      <p className="text-stone-600 mt-2">Choose a ready option or describe one precise change. The current version stays saved.</p>

      <h3 className="font-semibold mt-6">Wall panel placement</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
        {PANEL_LAYOUTS.map(item=><button key={item.label} type="button" onClick={()=>choosePreset(item.label,item.value)} className={`rounded-2xl border px-3 py-3 text-sm font-medium ${selectedPreset===item.label?'border-black bg-black text-white':'border-stone-300 bg-white hover:bg-stone-100'}`}>{item.label}</button>)}
      </div>

      <h3 className="font-semibold mt-6">Other details</h3>
      <div className="flex flex-wrap gap-2 mt-3">
        {DETAIL_EDITS.map(item=><button key={item.label} type="button" onClick={()=>choosePreset(item.label,item.value)} className={`rounded-full border px-4 py-2 text-sm font-medium ${selectedPreset===item.label?'border-black bg-black text-white':'border-stone-300 bg-white hover:bg-stone-100'}`}>{item.label}</button>)}
      </div>

      <form onSubmit={submitEdit} className="mt-6 space-y-3">
        <label htmlFor="edit-instruction" className="block font-medium">Your change</label>
        <textarea id="edit-instruction" value={instruction} onChange={event=>{setInstruction(event.target.value);setSelectedPreset('')}} maxLength={600} rows={4} className="w-full rounded-2xl border border-stone-300 bg-white p-4" placeholder="Example: Keep the panel only on the left side and make its edge softly curved with warm LED light. Change nothing else."/>
        {editError&&<p className="text-sm text-red-700">{editError}</p>}
        <button type="submit" disabled={editing||!instruction.trim()} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50">{editing?'Editing this detail…':'Generate edited version'}</button>
        <p className="text-center text-xs text-stone-500">One option creates one new AI image. Your current image remains saved.</p>
      </form>
    </section>

    <div className="grid sm:grid-cols-2 gap-3">
      <a href={url} download={`roomai-${design.style.toLowerCase().replaceAll(' ','-')}.png`} className="btn-primary text-center">Save image to iPhone</a>
      <Link href="/new-project" className="btn-soft text-center">Create another design</Link>
    </div>
  </div>;
}
