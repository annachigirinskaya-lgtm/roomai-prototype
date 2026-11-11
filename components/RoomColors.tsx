'use client';

import { useState } from 'react';
import { saveLocalDesign, type LocalDesign } from '@/lib/local-designs';
import { prepareVisionUpload } from '@/lib/vision-upload';

const PALETTES=[
  {name:'Warm beige',colors:['#eee2cd','#c6ac89','#78583e']},
  {name:'Cream & walnut',colors:['#f5efe3','#bfa58a','#654431']},
  {name:'Lilac & ivory',colors:['#c2acd5','#eee9df','#756583']},
  {name:'Sage & oak',colors:['#a6b09a','#ddcfb6','#927652']},
  {name:'Navy & sand',colors:['#293e58','#e2d3ba','#a78762']},
  {name:'Gray & charcoal',colors:['#dedbd5','#9a9c9f','#404448']},
];
const TARGETS={room:'Room palette',walls:'Walls only',textiles:'Bedding, curtains & rug',furniture:'Furniture finishes'};
type Target=keyof typeof TARGETS;

export default function RoomColors({design,disabled,onBusyChange}:{design:LocalDesign;disabled:boolean;onBusyChange:(busy:boolean)=>void}){
  const [palette,setPalette]=useState(PALETTES[0].name);
  const [custom,setCustom]=useState('');
  const [target,setTarget]=useState<Target>('room');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function apply(){
    if(busy||disabled)return;
    const colors=palette==='Custom'?custom.trim():palette;
    if(!colors){setError('Describe the colors you want to try.');return}
    setBusy(true);onBusyChange(true);setError('');
    try{
      const image=await prepareVisionUpload(design.image);
      const body=new FormData();body.append('image',image,'current-room.jpg');body.append('operation','detail');
      const scope=target==='room'?'Coordinate the existing wall paint, upholstery and textiles with this palette; keep natural wood and metal materials recognizable.':target==='walls'?'Recolor only the existing painted wall surfaces. Keep furniture, bedding, curtains, rug, flooring and all other finishes unchanged.':target==='textiles'?'Recolor only the existing bedding, curtains and rug. Keep walls, furniture, flooring and all other finishes unchanged.':'Recolor only the existing furniture finishes and upholstery. Keep walls, flooring, textiles and decor unchanged.';
      body.append('instruction',`COLOR CHANGE ONLY. Desired colors: ${colors}. ${scope} Preserve the chosen ${design.style} design and its level of detail. Keep exactly the same furniture, object shapes, positions, camera, lighting and room geometry. Preserve the exact number, size and positions of doors and windows. Never add doors, openings, furniture or decorations. Change color and finish only, without replacing or moving any object.`);
      const response=await fetch('/api/designs/refine',{method:'POST',body});
      if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||`Could not change colors (${response.status}). Please try again.`)}
      if(!response.headers.get('content-type')?.startsWith('image/'))throw new Error('No revised photo was returned. Reopen your invitation link and try again.');
      const revised=await response.blob();if(!revised.size)throw new Error('The revised photo was empty. Please try again.');
      const id=crypto.randomUUID();
      await saveLocalDesign({...design,id,image:revised,shopping:undefined,createdAt:Date.now(),parentId:design.id,rootId:design.rootId||design.id,editInstruction:`Colors · ${colors} · ${TARGETS[target]}`,project:{...design.project,...(target==='room'?{color_palette:colors}:{ }),color_revision:{colors,target}}});
      window.location.assign(`/local-result?id=${encodeURIComponent(id)}`);
    }catch(reason){setError(reason instanceof Error?reason.message:'Could not change colors. Please try again.');setBusy(false);onBusyChange(false)}
  }
  return <section id="room-colors" className="card p-5 md:p-8 scroll-mt-4" aria-labelledby="room-colors-title">
    <h2 id="room-colors-title" className="text-2xl font-semibold">Change colors</h2>
    <p className="mt-2 text-sm text-stone-600">Try a new palette on this finished design. Your current version stays saved.</p>
    <fieldset disabled={busy||disabled} className="mt-4 space-y-4">
      <legend className="sr-only">Choose colors for the saved room</legend>
      <div className="grid grid-cols-2 gap-2">{PALETTES.map(option=><button key={option.name} type="button" aria-pressed={palette===option.name} onClick={()=>{setPalette(option.name);setError('')}} className={`rounded-2xl border-2 p-3 text-left text-sm ${palette===option.name?'border-black':'border-stone-200'}`}><span className="mb-2 flex gap-1" aria-hidden="true">{option.colors.map(color=><span key={color} className="h-5 w-5 rounded-full border border-black/10" style={{backgroundColor:color}}/>)}</span>{option.name}</button>)}</div>
      <button type="button" aria-pressed={palette==='Custom'} className={`btn-soft w-full ${palette==='Custom'?'ring-2 ring-black':''}`} onClick={()=>setPalette('Custom')}>Use my own colors</button>
      {palette==='Custom'&&<label className="block text-sm font-semibold">Your colors<input className="input mt-2" value={custom} maxLength={240} onChange={event=>setCustom(event.target.value)} placeholder="Warm beige, ivory, lilac accents…"/></label>}
      <label className="block text-sm font-semibold">What to recolor<select aria-label="What to recolor" className="input mt-2" value={target} onChange={event=>setTarget(event.target.value as Target)}>{Object.entries(TARGETS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    </fieldset>
    {error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    <button type="button" onClick={()=>void apply()} disabled={busy||disabled} className="btn-primary mt-5 w-full disabled:opacity-50">{busy?'Applying colors…':'Apply colors · save a new version'}</button>
    <p className="mt-2 text-xs text-stone-500" aria-live="polite">{busy?'Creating one new image. Keep this page open until it finishes.':'Creates one new image. You can compare both versions after it finishes.'}</p>
  </section>;
}
