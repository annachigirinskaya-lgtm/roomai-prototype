'use client';
import { useState } from 'react';

const plans=[
  {id:'weekly',name:'Weekly',price:'$6.99',period:'every 7 days',premium:'5 premium credits',badge:'MOST POPULAR'},
  {id:'monthly',name:'Monthly',price:'$14.99',period:'per month',premium:'15 premium credits'},
  {id:'yearly',name:'Yearly',price:'$59.99',period:'per year',premium:'60 premium credits',badge:'BEST VALUE'},
] as const;

export default function Pricing({paymentsEnabled=false}:{paymentsEnabled?:boolean}){
  const [busy,setBusy]=useState('');
  async function checkout(kind:'subscription',id:string){
    const key=`${kind}:${id}`;setBusy(key);
    try{
      const r=await fetch('/api/stripe/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(kind==='subscription'?{plan:id}:{pack:id})});
      const d=await r.json();
      if(r.ok&&d.url)location.href=d.url;else alert(d.error||'Please log in first.');
    }catch{alert('Checkout is temporarily unavailable. Please try again later.')}finally{setBusy('')}
  }
  return <div className="space-y-10">
    <section>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold">Create and refine your room.</h1>
        <p className="text-stone-600 mt-2">Every paid plan includes standard designs, style comparisons and individual object edits. Real-product matching uses the included premium credits.</p>
      </div>
      <div className="grid md:grid-cols-4 gap-4">
        <div className="card p-6">
          <h3 className="text-xl font-semibold">Free</h3><p className="text-3xl font-bold mt-2">$0</p>
          <p className="mt-3 font-medium">5 standard image results</p>
          <p className="text-sm text-stone-600 mt-2">Try the core redesign experience before subscribing.</p>
        </div>
        {plans.map(p=><div className="card p-6 relative" key={p.id}>
          {'badge' in p && p.badge ? <span className="text-xs font-semibold tracking-wide">{p.badge}</span> : null}
          <h3 className="text-xl font-semibold mt-1">{p.name}</h3><p className="text-3xl font-bold mt-2">{p.price}</p>
          <p className="mt-3 font-medium">Standard designs and detail edits included*</p>
          <p className="text-sm text-stone-600 mt-1">+ {p.premium}</p><p className="text-sm text-stone-500 mt-1">{p.period}</p>
          <button className="btn-primary mt-6 w-full disabled:opacity-50" disabled={!paymentsEnabled||Boolean(busy)} onClick={()=>checkout('subscription',p.id)}>{!paymentsEnabled?'Coming soon':busy===`subscription:${p.id}`?'Opening checkout…':'Choose plan'}</button>
        </div>)}
      </div>
      <p className="text-xs text-stone-500 mt-4">*Fair-use and anti-abuse limits apply. A six-style comparison produces six images; free accounts have five standard results. Included premium credits renew each billing period.</p>
    </section>

    <section className="card p-6">
      <h2 className="text-2xl font-semibold">What is included?</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5 text-sm">
        <div><b>Paid plans</b><br/>Try styles and colors without spending premium credits.</div>
        <div><b>Paid plans</b><br/>Edit details and replace objects without spending premium credits.</div>
        <div><b>2 premium credits</b><br/>Generate a room design with real-product suggestions.</div>
        <div><b>Free plan</b><br/>1 credit per successfully generated standard image, 5 included.</div>
      </div>
    </section>

  </div>
}
