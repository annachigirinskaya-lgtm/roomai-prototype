'use client';

import Link from 'next/link';
import { FormEvent, MouseEvent, useEffect, useState } from 'react';
import { getLocalDesign, getLocalDesigns, saveLocalDesign, type LocalDesign } from '@/lib/local-designs';

type DesignVersion={id:string;label:string;url:string;current:boolean};
type SelectedItem={category:string;label:string;x:number;y:number;query:string;storeLinks:{store:string;url:string}[]};

const ITEM_CATEGORIES=[
  ['vase','Vase'],['flower arrangement','Flowers'],['decorative bowl','Decorative bowl'],['tray','Tray'],['candle','Candle'],['books','Books'],['sculpture','Sculpture'],['throw pillow','Pillow'],['blanket','Blanket'],['rug','Rug'],['sofa','Sofa'],['armchair','Armchair'],['ottoman','Ottoman'],['coffee table','Coffee table'],['side table','Side table'],['dining table','Dining table'],['dining chair','Dining chair'],['bar stool','Bar stool'],['tv','TV'],['tv console','TV console'],['floor lamp','Floor lamp'],['table lamp','Table lamp'],['ceiling light','Ceiling light'],['chandelier','Chandelier'],['curtains','Curtains'],['wall art','Wall art'],['mirror','Mirror'],['indoor plant','Plant'],['plant pot','Plant pot'],['wall panel','Wall panel'],['fireplace','Fireplace'],['shelving','Shelving'],['cabinet','Cabinet'],['decor accessory','Other decor'],
] as const;

async function cropAroundPoint(image:Blob,x:number,y:number){
  const bitmap=await createImageBitmap(image);
  const side=Math.max(64,Math.min(bitmap.width,bitmap.height)*0.32);
  const centerX=(x/100)*bitmap.width;
  const centerY=(y/100)*bitmap.height;
  const sourceX=Math.max(0,Math.min(bitmap.width-side,centerX-side/2));
  const sourceY=Math.max(0,Math.min(bitmap.height-side,centerY-side/2));
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
  const context=canvas.getContext('2d');
  if(!context){bitmap.close();throw new Error('Could not inspect this image area.')}
  context.drawImage(bitmap,sourceX,sourceY,side,side,0,0,512,512);bitmap.close();
  return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not prepare this image area.')),'image/png'));
}

function selectionRadius(category:string){
  const small=['vase','flower arrangement','decorative bowl','tray','candle','books','sculpture','table lamp','plant pot','decor accessory'];
  const soft=['throw pillow','blanket'];
  const large=['rug','sofa','curtains','wall panel','fireplace','shelving','cabinet'];
  if(small.includes(category))return {x:0.09,y:0.14};
  if(soft.includes(category))return {x:0.16,y:0.18};
  if(large.includes(category))return {x:0.28,y:0.30};
  return {x:0.18,y:0.22};
}

async function createSelectionMask(image:Blob,x:number,y:number,category:string){
  const bitmap=await createImageBitmap(image);
  const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
  const context=canvas.getContext('2d');
  if(!context){bitmap.close();throw new Error('Could not prepare the selected area.')}
  context.fillStyle='rgba(0,0,0,1)';context.fillRect(0,0,canvas.width,canvas.height);
  const radius=selectionRadius(category);
  context.globalCompositeOperation='destination-out';
  context.beginPath();
  context.ellipse((x/100)*canvas.width,(y/100)*canvas.height,canvas.width*radius.x,canvas.height*radius.y,0,0,Math.PI*2);
  context.fill();bitmap.close();
  return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not prepare the selected area.')),'image/png'));
}

const SWAP_OPTIONS:Record<string,{label:string;detail:string}[]>={
  rug:[{label:'More luxurious',detail:'a more luxurious designer rug with richer texture'},{label:'Larger',detail:'a larger properly scaled area rug'},{label:'Organic shape',detail:'a fashionable organic-shaped rug'},{label:'Subtle pattern',detail:'an elegant rug with a subtle pattern'}],
  sofa:[{label:'Curved sofa',detail:'an elegant curved designer sofa'},{label:'Sectional',detail:'a comfortable correctly scaled sectional sofa'},{label:'Velvet',detail:'a tailored velvet sofa'},{label:'Bouclé',detail:'a sculptural bouclé sofa'}],
  lighting:[{label:'Statement light',detail:'a dramatic statement chandelier'},{label:'Modern',detail:'a refined modern ceiling light'},{label:'Brass',detail:'an elegant brass light fixture'},{label:'Sculptural',detail:'a sculptural designer light'}],
  'coffee table':[{label:'Wood',detail:'a warm solid-wood designer coffee table'},{label:'Stone',detail:'an elegant stone coffee table'},{label:'Glass',detail:'a refined glass and metal coffee table'},{label:'Organic shape',detail:'an organic-shaped designer coffee table'}],
};

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
  const [useSelectionMask,setUseSelectionMask]=useState(false);
  const [versions,setVersions]=useState<DesignVersion[]>([]);
  const [selectedItem,setSelectedItem]=useState<SelectedItem>();
  const [identifying,setIdentifying]=useState(false);
  const [identifyError,setIdentifyError]=useState('');
  const [productImage,setProductImage]=useState<File>();
  const [productPreviewUrl,setProductPreviewUrl]=useState('');
  const [placingProduct,setPlacingProduct]=useState(false);
  const [productError,setProductError]=useState('');

  useEffect(()=>{
    const objectUrls:string[]=[];
    const id=new URLSearchParams(window.location.search).get('id')||'';
    getLocalDesign(id).then(async item=>{
      if(!item){setError('This saved design was not found on this device.');return}
      const objectUrl=URL.createObjectURL(item.image);objectUrls.push(objectUrl);setDesign(item);setUrl(objectUrl);
      const rootId=item.rootId||item.id;
      const all=await getLocalDesigns();
      const family=all.filter(candidate=>candidate.id===rootId||candidate.rootId===rootId);
      setVersions(family.map((candidate,index)=>{
        if(candidate.id===item.id)return {id:candidate.id,label:candidate.editInstruction||'Current version',url:objectUrl,current:true};
        const versionUrl=URL.createObjectURL(candidate.image);objectUrls.push(versionUrl);
        return {id:candidate.id,label:candidate.editInstruction||`Original design ${index+1}`,url:versionUrl,current:false};
      }));
    }).catch(()=>setError('Could not open the saved design.'));
    return()=>objectUrls.forEach(objectUrl=>URL.revokeObjectURL(objectUrl));
  },[]);

  useEffect(()=>()=>{if(productPreviewUrl)URL.revokeObjectURL(productPreviewUrl)},[productPreviewUrl]);

  function choosePreset(label:string,value:string){
    setSelectedPreset(label);
    setInstruction(value);
    setUseSelectionMask(false);
    setEditError('');
  }

  function searchLinks(category:string,label:string){
    const query=`${design?.style||'interior'} ${project.color_palette||'neutral'} ${category} for living room`;
    const q=encodeURIComponent(query);
    return {category,label,x:selectedItem?.x||50,y:selectedItem?.y||50,query,storeLinks:[{store:'Amazon',url:`https://www.amazon.com/s?k=${q}`},{store:'Walmart',url:`https://www.walmart.com/search?q=${q}`}]};
  }

  async function selectImageItem(event:MouseEvent<HTMLButtonElement>){
    if(!design||identifying)return;
    const box=event.currentTarget.getBoundingClientRect();
    const x=((event.clientX-box.left)/box.width)*100;
    const y=((event.clientY-box.top)/box.height)*100;
    setIdentifying(true);setIdentifyError('');setSelectedItem(undefined);
    try{
      const crop=await cropAroundPoint(design.image,x,y);
      const form=new FormData();form.append('image',design.image,'current-design.png');form.append('crop',crop,'selected-area.png');form.append('x',String(x));form.append('y',String(y));form.append('style',design.style);form.append('palette',project.color_palette||'neutral');
      const response=await fetch('/api/designs/identify-item',{method:'POST',body:form});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||'Could not identify this item.');
      setSelectedItem(result);
    }catch(reason){
      setSelectedItem({category:'decor',label:'Choose item below',x,y,query:'',storeLinks:[]});
      setIdentifyError(reason instanceof Error?reason.message:'Choose the item manually below.');
    }finally{setIdentifying(false)}
  }

  function chooseSwap(detail:string){
    if(!selectedItem)return;
    setSelectedPreset(`Replace ${selectedItem.label}`);
    setUseSelectionMask(true);
    setInstruction(`MANDATORY VISIBLE REPLACEMENT: replace the selected ${selectedItem.category} located around ${selectedItem.x.toFixed(1)}% from the left and ${selectedItem.y.toFixed(1)}% from the top with ${detail}. The replacement must be clearly different in silhouette, material, color or pattern; do not return the original selected object unchanged. Keep it in the same functional area and preserve the exact room, architecture, camera, lighting and every other item unchanged.`);
  }

  function chooseProductImage(file?:File){
    if(productPreviewUrl)URL.revokeObjectURL(productPreviewUrl);
    setProductImage(file);setProductPreviewUrl(file?URL.createObjectURL(file):'');setProductError('');
  }

  async function placeExactProduct(){
    if(!design||!selectedItem||!productImage||placingProduct)return;
    setPlacingProduct(true);setProductError('');
    try{
      const form=new FormData();
      form.append('room',design.image,'current-design.png');
      form.append('product',productImage,productImage.name||'selected-product.png');
      form.append('category',selectedItem.category);form.append('x',String(selectedItem.x));form.append('y',String(selectedItem.y));
      const response=await fetch('/api/designs/place-product',{method:'POST',body:form});
      if(!response.ok){const message=await response.json().catch(()=>({}));throw new Error(message.error||'Could not place this product in the room.')}
      const revised=await response.blob();const id=crypto.randomUUID();
      await saveLocalDesign({...design,id,createdAt:Date.now(),image:revised,parentId:design.id,rootId:design.rootId||design.id,editInstruction:`Exact product · ${selectedItem.label}`});
      window.location.assign(`/local-result?id=${encodeURIComponent(id)}`);
    }catch(reason){setProductError(reason instanceof Error?reason.message:'Could not place this product in the room.');setPlacingProduct(false)}
  }

  async function submitEdit(event:FormEvent){
    event.preventDefault();
    if(!design||!instruction.trim()||editing)return;
    setEditing(true);setEditError('');
    try{
      const form=new FormData();
      form.append('image',design.image,'current-design.png');
      form.append('instruction',instruction.trim());
      if(useSelectionMask&&selectedItem){
        const mask=await createSelectionMask(design.image,selectedItem.x,selectedItem.y,selectedItem.category);
        form.append('mask',mask,'selection-mask.png');
      }
      const response=await fetch('/api/designs/refine',{method:'POST',body:form});
      if(!response.ok){
        const message=await response.json().catch(()=>({}));
        throw new Error(message.error||'Could not edit this design.');
      }
      const revised=await response.blob();
      const id=crypto.randomUUID();
      await saveLocalDesign({...design,id,createdAt:Date.now(),image:revised,parentId:design.id,rootId:design.rootId||design.id,editInstruction:selectedPreset||instruction.trim()});
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
        <div className="kicker">Saved on this device · AI-generated</div><Link href="/compare" className="inline-block mt-3 underline font-semibold">← Back to comparison</Link>
        <h1 className="text-3xl md:text-5xl font-semibold mt-2">{project.name||'My room'}</h1>
        <p className="text-stone-600 mt-3">{design.style} · {project.color_palette||'Selected palette'}</p>
        {design.editInstruction&&<p className="mt-3 text-sm text-stone-500">Edited version: {design.editInstruction}</p>}
      </div>
      <button type="button" onClick={selectImageItem} className="relative block w-full cursor-crosshair text-left" aria-label="Tap an interior item to select it">
        <img src={url} alt={`AI-generated ${design.style} design of the uploaded room`} className="w-full object-cover"/>
        {selectedItem&&<span className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-black/80 shadow-lg" style={{left:`${selectedItem.x}%`,top:`${selectedItem.y}%`}}/>}
        {identifying&&<span className="absolute inset-0 grid place-items-center bg-black/35 text-lg font-semibold text-white">Identifying item…</span>}
        {!selectedItem&&!identifying&&<span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-sm font-semibold text-white shadow-lg">Tap an item to change it</span>}
      </button>
    </section>

    {selectedItem&&<section className="card p-6 md:p-8">
      <div className="kicker">Selected on the image</div>
      <h2 className="text-2xl font-semibold mt-2">{selectedItem.label}</h2>
      {identifyError&&<p className="mt-2 text-sm text-amber-700">{identifyError}</p>}
      <p className="mt-2 text-stone-600">Choose a replacement direction, shop current retailer results, or correct the detected item.</p>

      <div className="grid grid-cols-2 gap-2 mt-5">
        {(SWAP_OPTIONS[selectedItem.category]||[
          {label:'More luxurious',detail:`a more luxurious designer ${selectedItem.category}`},
          {label:'More modern',detail:`a refined modern ${selectedItem.category}`},
          {label:'Lighter',detail:`a lighter-colored ${selectedItem.category}`},
          {label:'Darker',detail:`a darker statement ${selectedItem.category}`},
        ]).map(option=><button key={option.label} type="button" onClick={()=>chooseSwap(option.detail)} className="rounded-2xl border border-stone-300 bg-white px-3 py-3 text-sm font-medium hover:bg-stone-100">Replace · {option.label}</button>)}
      </div>
      <p className="mt-3 text-xs text-stone-500">Replacement buttons isolate the tapped object so the new version changes that item instead of redrawing the room.</p>

      <div className="grid grid-cols-2 gap-2 mt-4">
        {selectedItem.storeLinks.map(link=><a key={link.store} href={link.url} target="_blank" rel="noopener noreferrer" className="btn-soft text-center">Shop on {link.store}</a>)}
      </div>
      <p className="mt-3 text-xs text-stone-500">These buttons open live retailer search results. Prices, product images and availability come from the retailer, not from RoomAI.</p>

      <div className="mt-6 rounded-3xl bg-stone-100 p-5">
        <h3 className="text-lg font-semibold">Try the exact product in your room</h3>
        <p className="mt-2 text-sm text-stone-600">After choosing a product on Amazon or Walmart, save its product photo or take a screenshot. Return here and upload it. RoomAI will replace only the selected {selectedItem.label.toLowerCase()} with that exact product.</p>
        <label className="btn-soft mt-4 block cursor-pointer text-center">
          {productImage?'Choose a different product photo':'Upload product photo or screenshot'}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={event=>chooseProductImage(event.target.files?.[0])}/>
        </label>
        {productPreviewUrl&&<img src={productPreviewUrl} alt="Selected real product reference" className="mx-auto mt-4 max-h-56 rounded-2xl border border-stone-200 bg-white object-contain"/>}
        {productError&&<p className="mt-3 text-sm text-red-700">{productError}</p>}
        <button type="button" onClick={placeExactProduct} disabled={!productImage||placingProduct} className="btn-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-50">{placingProduct?'Placing this product…':'Place this exact product in my room'}</button>
        <p className="mt-3 text-center text-xs text-stone-500">Creates one new AI preview. The current room version stays saved.</p>
      </div>

      <details className="mt-5">
        <summary className="cursor-pointer font-medium">Wrong item? Choose manually</summary>
        <div className="flex flex-wrap gap-2 mt-3">{ITEM_CATEGORIES.map(([category,label])=><button key={category} type="button" onClick={()=>setSelectedItem(searchLinks(category,label))} className="rounded-full border border-stone-300 px-3 py-2 text-sm">{label}</button>)}</div>
      </details>
    </section>}

    {versions.length>1&&<section className="card p-6 md:p-8">
      <div className="kicker">Saved variations</div>
      <h2 className="text-2xl font-semibold mt-2">Compare your versions</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
        {versions.map(version=><Link key={version.id} href={`/local-result?id=${encodeURIComponent(version.id)}`} className={`overflow-hidden rounded-2xl border-2 ${version.current?'border-black':'border-transparent bg-stone-100'}`}>
          <img src={version.url} alt={version.label} className="aspect-[3/2] w-full object-cover"/>
          <div className="p-3 text-sm font-medium">{version.current?'Selected · ':''}{version.label}</div>
        </Link>)}
      </div>
    </section>}

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
        <textarea id="edit-instruction" value={instruction} onChange={event=>{setInstruction(event.target.value);setSelectedPreset('');setUseSelectionMask(false)}} maxLength={600} rows={4} className="w-full rounded-2xl border border-stone-300 bg-white p-4" placeholder="Example: Keep the panel only on the left side and make its edge softly curved with warm LED light. Change nothing else."/>
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
