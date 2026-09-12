'use client';
import { useState } from 'react';

const plans=[
  {id:'weekly',name:'Weekly',price:'$6.99',period:'every 7 days',premium:'5 premium credits',badge:'MOST POPULAR'},
  {id:'monthly',name:'Monthly',price:'$14.99',period:'per month',premium:'15 premium credits'},
  {id:'yearly',name:'Yearly',price:'$59.99',period:'per year',premium:'60 premium credits',badge:'BEST VALUE'},
] as const;

const packs=[
  {id:'pack10',name:'Quick add-on',price:'$4.99',credits:'10 premium credits'},
  {id:'pack30',name:'Project add-on',price:'$9.99',credits:'30 premium credits'},
  {id:'pack100',name:'Power add-on',price:'$24.99',credits:'100 premium credits'},
] as const;

export default function Pricing(){
  const [busy,setBusy]=useState('');
  async function checkout(kind:'subscription'|'pack',id:string){
    const key=`${kind}:${id}`;setBusy(key);
    const r=await fetch('/api/stripe/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(kind==='subscription'?{plan:id}:{pack:id})});
    const d=await r.json();setBusy('');
    if(r.ok&&d.url)location.href=d.url;else alert(d.error||'Please log in first.');
  }
  return <div className="space-y-10">
    <section>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold">Simple plans. Premium tools when you need them.</h1>
        <p className="text-stone-600 mt-2">Paid plans include unlimited basic room transformations. Premium shopping and export tools use credits.</p>
      </div>
      <div className="grid md:grid-cols-4 gap-4">
        <div className="card p-6">
          <h3 className="text-xl font-semibold">Free</h3><p className="text-3xl font-bold mt-2">$0</p>
          <p className="mt-3 font-medium">5 basic designs</p>
          <p className="text-sm text-stone-600 mt-2">Try the core redesign experience before subscribing.</p>
        </div>
        {plans.map(p=><div className="card p-6 relative" key={p.id}>
          {'badge' in p && p.badge ? <span className="text-xs font-semibold tracking-wide">{p.badge}</span> : null}
          <h3 className="text-xl font-semibold mt-1">{p.name}</h3><p className="text-3xl font-bold mt-2">{p.price}</p>
          <p className="mt-3 font-medium">Unlimited basic redesigns*</p>
          <p className="text-sm text-stone-600 mt-1">+ {p.premium}</p><p className="text-sm text-stone-500 mt-1">{p.period}</p>
          <button className="btn-primary mt-6 w-full" disabled={busy===`subscription:${p.id}`} onClick={()=>checkout('subscription',p.id)}>{busy===`subscription:${p.id}`?'Opening checkout…':'Choose plan'}</button>
        </div>)}
      </div>
      <p className="text-xs text-stone-500 mt-4">*Unlimited basic redesigns are subject to reasonable fair-use and anti-abuse limits. Purchased premium credits do not expire.</p>
    </section>

    <section className="card p-6">
      <h2 className="text-2xl font-semibold">What is included vs. premium?</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5 text-sm">
        <div><b>Included on paid plans</b><br/>Try styles, colors and standard room redesigns.</div>
        <div><b>2 credits</b><br/>Shoppable design with real-product matching.</div>
        <div><b>1 credit</b><br/>Make the room cheaper / change the budget.</div>
        <div><b>1 credit</b><br/>Swap a selected item or product.</div>
        <div><b>2 credits</b><br/>Final high-resolution render.</div>
        <div><b>Free plan</b><br/>1 credit per standard redesign, 5 included.</div>
      </div>
    </section>

    <section>
      <h2 className="text-2xl font-semibold">Need premium tools?</h2>
      <p className="text-stone-600 mt-2">Buy a one-time credit pack without changing your subscription. These credits do not expire.</p>
      <div className="grid md:grid-cols-3 gap-4 mt-5">
        {packs.map(p=><div className="card p-6" key={p.id}><h3 className="text-lg font-semibold">{p.name}</h3><p className="text-3xl font-bold mt-2">{p.price}</p><p className="mt-2">{p.credits}</p><button className="btn-soft mt-5 w-full" disabled={busy===`pack:${p.id}`} onClick={()=>checkout('pack',p.id)}>{busy===`pack:${p.id}`?'Opening checkout…':'Buy credits'}</button></div>)}
      </div>
    </section>
  </div>
}
