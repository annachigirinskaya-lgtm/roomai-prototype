'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type DemoProject={name?:string;room_type?:string;style?:string;color_palette?:string;budget?:number;budget_mode?:string;keep_items?:string;replace_items?:string;notes?:string;previewImage?:string;comparedStyles?:string[];pinnedStyle?:string};
const catalog=[
 {category:'Main furniture',title:'Cream performance-fabric sofa',store:'Amazon',price:629},
 {category:'Rug',title:'Neutral textured 8×10 rug',store:'Walmart',price:178},
 {category:'Coffee table',title:'Warm oak round coffee table',store:'IKEA',price:199},
 {category:'Lighting',title:'Brass floor lamp',store:'Amazon',price:119},
 {category:'Curtains',title:'Linen-look curtain pair',store:'Walmart',price:68},
 {category:'Decor',title:'Pillow & decor set',store:'Temu',price:64},
];
export default function DemoResult(){
 const [p,setP]=useState<DemoProject>({});
 useEffect(()=>{try{setP(JSON.parse(localStorage.getItem('roomai_demo_project')||'{}'))}catch{}},[]);
 const budget=Number(p.budget||1500);
 const products=useMemo(()=>{let running=0;return catalog.filter(x=>{if(running+x.price<=budget*1.05){running+=x.price;return true}return false})},[budget]);
 const total=products.reduce((n,x)=>n+x.price,0);
 return <div className="space-y-8">
   <section className="card overflow-hidden">
     <div className="p-6 md:p-8"><div className="text-xs uppercase tracking-[.2em] text-stone-500">Demo result</div><h1 className="text-3xl md:text-5xl font-semibold mt-2">{p.name||'Your shoppable room'}</h1><p className="text-stone-600 mt-3">{p.style||'Modern'} · {p.color_palette||'Warm White'} · target budget ${budget.toLocaleString()}</p></div>
     <div className="min-h-[360px] md:min-h-[520px] bg-gradient-to-br from-amber-100 via-stone-50 to-emerald-50 relative overflow-hidden">
       {p.previewImage?<img src={p.previewImage} alt="Your room" className="absolute inset-0 w-full h-full object-cover"/>:<><div className="absolute left-[8%] right-[8%] bottom-[16%] h-[30%] rounded-[2rem] bg-stone-100 border-[10px] border-amber-700/40 shadow-xl"></div><div className="absolute right-[9%] top-[18%] w-28 h-52 rounded-full bg-emerald-800/45"></div></>}
       <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
       <div className="absolute top-5 left-5 rounded-full bg-white/90 px-4 py-2 text-sm font-medium shadow">Selected • {p.style||'Modern'}</div>
       <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-black/75 text-white p-4 backdrop-blur"><b>V6 demo: this is your uploaded room with the selected style brief.</b><div className="text-sm text-white/70 mt-1">The true furniture transformation replaces this preview after the image model is connected.</div></div>
     </div>
   </section>
   <section className="grid grid-cols-3 gap-3"><Stat v={`$${total}`} l="shopping total"/><Stat v={`${products.length}`} l="products"/><Stat v={`${new Set(products.map(x=>x.store)).size}`} l="stores"/></section>
   <section className="card p-6"><h2 className="text-2xl font-semibold">Shop this room</h2><p className="text-stone-600 mt-2">Demo product matches selected to stay close to your budget. Affiliate links will replace these demo buttons after partner approval.</p><div className="mt-5 divide-y divide-stone-200">{products.map((x,i)=><div key={i} className="py-4 flex gap-4 items-center"><div className="w-20 h-20 rounded-2xl bg-stone-100 border border-stone-200"></div><div className="flex-1"><div className="text-xs uppercase tracking-wider text-stone-500">{x.store} · {x.category}</div><div className="font-medium mt-1">{x.title}</div><div className="font-semibold mt-1">${x.price}</div></div><button className="px-4 py-2 rounded-xl border border-stone-300 text-sm">View</button></div>)}</div></section>
   <section className="grid md:grid-cols-2 gap-3"><button className="btn-secondary">Make it cheaper · 1 credit</button><button className="btn-secondary">Replace one item · 1 credit</button><button className="btn-secondary">High-res final · 2 credits</button><Link href="/new-project" className="btn-primary text-center">Try another design</Link></section>
 </div>
}
function Stat({v,l}:{v:string,l:string}){return <div className="card p-4 text-center"><div className="text-xl font-semibold">{v}</div><div className="text-[11px] uppercase tracking-wider text-stone-500 mt-1">{l}</div></div>}
