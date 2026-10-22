'use client';

import { useEffect, useRef, useState } from 'react';
import { saveLocalDesign, type LocalDesign } from '@/lib/local-designs';
import { shoppingTotal, type ShoppingItem, type ShoppingList } from '@/lib/shopping';
import { prepareVisionUpload } from '@/lib/vision-upload';
import { readShoppingResponse } from '@/lib/shopping-response';

type Selection={category:string;label:string;x:number;y:number};
const money=(value:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value);

export default function RoomShopping({design,selected,open,onClose}:{design:LocalDesign;selected?:Selection;open:boolean;onClose:()=>void}){
  const [list,setList]=useState<ShoppingList|undefined>(design.shopping);
  const [matches,setMatches]=useState<ShoppingItem[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [saveError,setSaveError]=useState('');
  const [checkedAt,setCheckedAt]=useState(design.shopping?.checkedAt||'');
  const abort=useRef<AbortController|null>(null);
  const dialog=useRef<HTMLDivElement>(null);
  const cache=useRef(new Map<string,ShoppingList>());
  const budget=Number(design.project.budget)||0;
  const selectedKey=selected?`${selected.category}:${selected.x}:${selected.y}`:'';

  async function persist(next:ShoppingList){
    setList(next);setSaveError('');
    try{await saveLocalDesign({...design,shopping:next})}catch{setSaveError('Prices are shown, but could not be saved on this device.')}
  }

  async function search(selection?:Selection){
    abort.current?.abort();
    const controller=new AbortController();abort.current=controller;
    setBusy(true);setError('');setMatches([]);
    try{
      const image=await prepareVisionUpload(design.image);
      if(controller.signal.aborted)return;
      const form=new FormData();form.append('image',image,'room-search.jpg');form.append('budget',String(budget));form.append('style',design.style);form.append('keep',String(design.project.keep_items||''));
      if(selection){form.append('category',selection.category);form.append('x',String(selection.x));form.append('y',String(selection.y))}
      const response=await fetch('/api/products/match',{method:'POST',body:form,signal:controller.signal});
      const data=await readShoppingResponse(response);
      if(controller.signal.aborted)return;
      setCheckedAt(data.checkedAt);
      if(selection){cache.current.set(`${selection.category}:${selection.x}:${selection.y}`,data);setMatches(data.items)}
      else{await persist(data)}
    }catch(reason){
      if(!controller.signal.aborted)setError(reason instanceof Error&&reason.name!=='SyntaxError'&&reason.name!=='TypeError'?reason.message:'Product search could not connect. Keep this page open and try again.');
    }
    finally{if(!controller.signal.aborted)setBusy(false)}
  }

  useEffect(()=>{
    if(!open){abort.current?.abort();setBusy(false);return}
    setError('');setMatches([]);
    if(selected){
      const known=(list?.items||[]).filter(item=>item.category.toLowerCase()===selected.category.toLowerCase()).sort((a,b)=>Math.hypot(a.x-selected.x,a.y-selected.y)-Math.hypot(b.x-selected.x,b.y-selected.y));
      const cached=cache.current.get(selectedKey);
      if(known.length){setMatches([known[0]]);setCheckedAt(list!.checkedAt)}
      else if(cached){setMatches(cached.items);setCheckedAt(cached.checkedAt)}
      else void search(selected);
    }
    return()=>abort.current?.abort();
    // Search follows explicit opening / a new tap, not saved-list updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[open,selectedKey]);

  useEffect(()=>{
    if(!open)return;
    const before=document.body.style.overflow;document.body.style.overflow='hidden';
    const previous=document.activeElement as HTMLElement|null;
    dialog.current?.focus();
    const onKey=(event:KeyboardEvent)=>{
      if(event.key==='Escape')onClose();
      if(event.key==='Tab'){
        const elements=dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input');
        if(!elements?.length)return;
        const first=elements[0],last=elements[elements.length-1];
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
      }
    };
    document.addEventListener('keydown',onKey);
    return()=>{document.body.style.overflow=before;document.removeEventListener('keydown',onKey);previous?.focus()};
  },[open,onClose]);

  if(!open)return null;
  const shown=selected?matches:list?.items||[];
  const summary=shoppingTotal(list?.items||[]);
  const over=budget>0&&summary.total>budget;
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-2 sm:items-center" onClick={onClose}>
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="shopping-title" tabIndex={-1} onClick={event=>event.stopPropagation()} className="w-full max-w-2xl max-h-[90dvh] overflow-y-auto rounded-3xl bg-white shadow-xl">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-white p-5">
        <div><h2 id="shopping-title" className="text-xl font-bold">{selected?`${selected.label} · price`:'Shop this room'}</h2><p className="text-xs text-stone-600">Similar real products · USD</p></div>
        <button type="button" onClick={onClose} className="rounded-full border px-4 py-2 font-semibold" aria-label="Close shopping">Close</button>
      </div>
      <div className="space-y-4 p-5">
        {!selected&&<>
          <p className="text-sm text-stone-600">Find furniture, electronics and decor for this design. Kept items can be excluded from the purchase total.</p>
          <button type="button" disabled={busy} onClick={()=>void search()} className="btn-primary w-full disabled:opacity-50">{busy?'Checking retailer prices…':list?'Refresh room prices':'Find products & prices for the whole room'}</button>
          {list&&<div className={`rounded-2xl p-4 ${over?'bg-amber-50':'bg-stone-100'}`}>
            <p className="text-sm">{summary.missing?'Known-price subtotal':'Products total'} · {summary.count} item groups</p><p className="text-3xl font-bold">{money(summary.total)}</p>
            {budget>0&&<p className="mt-1 text-sm">Budget {money(budget)} · {over?`${money(summary.total-budget)} over budget`:summary.missing?'Budget not yet confirmed':`${money(budget-summary.total)} remaining`}</p>}
            {!!summary.missing&&<p className="mt-2 text-sm text-amber-800">{summary.missing} item group(s) still need a confirmed price. This is not a complete room total.</p>}
            {over&&<p className="mt-2 text-sm">These matches exceed your budget. Keep existing pieces or choose less expensive alternatives before buying.</p>}
          </div>}
        </>}
        {busy&&<p role="status" className="rounded-2xl bg-stone-100 p-4">Searching retailer pages. Prices will appear here when available…</p>}
        {error&&<div role="alert" className="rounded-2xl bg-red-50 p-4 text-red-800"><p>{error}</p><button type="button" onClick={()=>void search(selected)} className="mt-2 underline">Try again</button></div>}
        {saveError&&<p role="alert" className="text-sm text-amber-800">{saveError}</p>}
        {shown.map(item=><article key={item.id} className="rounded-2xl border border-stone-200 p-4">
          <div className="flex items-start justify-between gap-3"><h3 className="font-bold capitalize">{item.category}{item.quantity>1?` × ${item.quantity}`:''}</h3><span className="shrink-0 text-lg font-bold">{item.price===null?'Price unavailable':money(item.price)}</span></div>
          <p className="mt-2 font-medium">{item.title}</p><p className="mt-1 text-sm text-stone-600">{item.description}</p>
          {item.price!==null&&item.quantity>1&&<p className="mt-2 text-sm">{money(item.price)} each · {money(item.price*item.quantity)} for {item.quantity}</p>}
          {item.productUrl?<><a href={item.productUrl} target="_blank" rel="noopener noreferrer" className="btn-soft mt-3 block text-center">View product · {item.store}</a>{item.priceQuote&&<p className="mt-2 text-xs text-stone-500">Retailer price text: {item.priceQuote}</p>}</>:<a href={`https://www.amazon.com/s?k=${encodeURIComponent(`${design.style} ${item.description||item.category}`)}`} target="_blank" rel="noopener noreferrer" className="mt-3 block text-sm underline">Search similar items on Amazon</a>}
          {!selected&&<label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={item.included} onChange={event=>{if(list)void persist({...list,items:list.items.map(current=>current.id===item.id?{...current,included:event.target.checked}:current)})}}/>Include in purchase total</label>}
        </article>)}
        {!!shown.length&&<p className="text-xs text-stone-500">Prices found {checkedAt?new Date(checkedAt).toLocaleString():''}. Retailer prices may change; check the selected variant at checkout. Delivery, sales tax and installation are not included. Products are similar matches to the AI design.</p>}
      </div>
    </div>
  </div>;
}
