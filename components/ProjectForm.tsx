'use client';
import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ROOM_TYPES, STYLES, PALETTES } from '@/lib/catalog';
import { useRouter } from 'next/navigation';

const DEMO_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const MAX_STYLES = 6;
const styleMood:Record<string,string>={
  Modern:'Clean · architectural · calm', Luxury:'Polished · rich · dramatic', 'Old Money':'Timeless · tailored · collected', Japandi:'Warm · minimal · natural', Scandinavian:'Light · soft · functional', Minimalist:'Quiet · simple · uncluttered', Contemporary:'Fresh · refined · current', Mediterranean:'Sun-washed · organic · relaxed', French:'Elegant · romantic · layered', 'Art Deco':'Glamorous · graphic · bold', Boho:'Textured · cozy · expressive', Coastal:'Airy · soft · relaxed', Industrial:'Urban · raw · structured', Farmhouse:'Warm · casual · classic', 'Mid-Century Modern':'Sculptural · warm wood · iconic'
};

export default function ProjectForm(){
  const router=useRouter();
  const [step,setStep]=useState<1|2|3>(1);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [file,setFile]=useState<File|null>(null);
  const [preview,setPreview]=useState('');
  const [selected,setSelected]=useState<string[]>(['Modern','Luxury','Japandi','Old Money']);
  const [pinned,setPinned]=useState('Modern');
  const [compareIndex,setCompareIndex]=useState(0);
  const [compareMode,setCompareMode]=useState<'pin'|'grid'>('pin');
  const [form,setForm]=useState({name:'',room_type:'Living Room',style:'Modern',color_palette:'Warm White',custom_colors:'',budget:1500,budget_mode:'balanced',keep_items:'',replace_items:'',notes:''});

  const alternatives=useMemo(()=>selected.filter(x=>x!==pinned),[selected,pinned]);
  const compareStyle=alternatives.length?alternatives[Math.min(compareIndex,alternatives.length-1)]:'';

  async function onFile(f:File|null){
    setFile(f); setError(''); if(!f){setPreview('');return}
    try{setPreview(await compressImage(f))}catch{setPreview(URL.createObjectURL(f))}
  }
  function toggleStyle(s:string){
    setError('');
    setSelected(cur=>{
      if(cur.includes(s)){
        if(cur.length===1)return cur;
        const next=cur.filter(x=>x!==s);
        if(s===pinned)setPinned(next[0]);
        setCompareIndex(0); return next;
      }
      if(cur.length>=MAX_STYLES){setError(`Choose up to ${MAX_STYLES} styles at a time.`);return cur}
      return [...cur,s];
    });
  }
  function goCompare(){
    if(!file){setError('Upload a room photo first.');return}
    if(selected.length<1){setError('Choose at least one style.');return}
    if(!selected.includes(pinned))setPinned(selected[0]);
    setCompareIndex(0); setStep(2); window.scrollTo({top:0,behavior:'smooth'});
  }
  function chooseWinner(style:string){
    setForm({...form,style}); setPinned(style); setStep(3); window.scrollTo({top:0,behavior:'smooth'});
  }
  async function submit(e:React.FormEvent){
    e.preventDefault(); if(!file){setError('Upload a room photo first.');return}
    setBusy(true); setError('');
    try{
      if(DEMO_MODE){
        localStorage.setItem('roomai_demo_project',JSON.stringify({...form,budget:Number(form.budget),style:form.style||pinned,fileName:file.name,previewImage:preview,comparedStyles:selected,pinnedStyle:pinned}));
        router.push('/demo-result'); return;
      }
      const s=createClient(); const {data:{user}}=await s.auth.getUser(); if(!user)throw new Error('Please log in first.');
      const ext=file.name.split('.').pop()||'jpg'; const path=`${user.id}/${crypto.randomUUID()}.${ext}`;
      const up=await s.storage.from('room-images').upload(path,file,{contentType:file.type,upsert:false}); if(up.error)throw up.error;
      const pr=await fetch('/api/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,budget:Number(form.budget),style:form.style||pinned,source_image_path:path})});
      const project=await pr.json(); if(!pr.ok)throw new Error(project.error||'Could not create project');
      const gr=await fetch('/api/designs/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId:project.id})});
      const design=await gr.json(); if(!gr.ok)throw new Error(design.error||'Could not generate design'); router.push(`/project/${project.id}`); router.refresh();
    }catch(e:any){setError(e.message)}finally{setBusy(false)}
  }

  return <div className="space-y-5">
    <Progress step={step}/>
    {step===1&&<section className="card p-5 md:p-7 space-y-6">
      {DEMO_MODE&&<div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900"><b>V6 demo:</b> upload your room and choose 1–6 styles. Pick one style, compare several in a grid, or pin one and swipe the others against it.</div>}
      <div><div className="kicker">01 · Your room</div><h2 className="text-3xl font-semibold mt-1">Upload once. Compare your styles.</h2><p className="text-stone-600 mt-2">You do not need to regenerate the form for every style.</p></div>
      <label className={`room-upload ${preview?'has-image':''}`}>
        {preview?<img src={preview} alt="Your room"/>:<div className="text-center"><div className="text-4xl">＋</div><b>Add your room photo</b><div className="text-sm text-stone-500 mt-1">Tap to choose a photo</div></div>}
        <input className="sr-only" type="file" accept="image/*" onChange={e=>onFile(e.target.files?.[0]||null)}/>
        {preview&&<span className="upload-chip">Change photo</span>}
      </label>
      <div className="grid md:grid-cols-2 gap-4"><Field label="Project name"><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="My living room"/></Field><Field label="Room type"><select className="input" value={form.room_type} onChange={e=>setForm({...form,room_type:e.target.value})}>{ROOM_TYPES.map(x=><option key={x}>{x}</option>)}</select></Field></div>
      <div><div className="flex items-end justify-between gap-3"><div><div className="label mb-1">Choose styles to compare</div><p className="text-sm text-stone-500">Select 1–6. You selected {selected.length}.</p></div><button type="button" className="text-sm underline" onClick={()=>setSelected(STYLES.slice(0,6))}>Pick 6 for me</button></div>
        <div className="style-grid mt-4">{STYLES.map((s,i)=><button type="button" key={s} onClick={()=>toggleStyle(s)} className={`style-card ${selected.includes(s)?'selected':''}`}><div className={`style-visual sv-${i%6}`}></div><div className="p-3"><div className="flex items-center justify-between gap-2"><b>{s}</b>{selected.includes(s)&&<span className="check">✓</span>}</div><div className="text-xs text-stone-500 mt-1">{styleMood[s]||'Curated interior style'}</div></div></button>)}</div>
      </div>
      {error&&<p className="text-red-700 text-sm">{error}</p>}
      <button type="button" className="btn-primary w-full" onClick={goCompare}>{selected.length===1?'Continue with this style':`Compare ${selected.length} styles`}</button>
    </section>}

    {step===2&&<section className="card p-5 md:p-7 space-y-6">
      <div className="flex items-start justify-between gap-3"><div><div className="kicker">02 · Style compare</div><h2 className="text-3xl font-semibold mt-1">Keep one style pinned.</h2><p className="text-stone-600 mt-2">Your pinned style stays fixed while you compare it against the others.</p></div><button className="btn-soft text-sm" onClick={()=>setStep(1)}>Edit styles</button></div>
      {selected.length===1?<div className="space-y-4"><ComparePane title="Your style" style={selected[0]} src={preview}/><button className="btn-primary w-full" onClick={()=>chooseWinner(selected[0])}>Continue with {selected[0]}</button></div>:<>
        <div className="compare-tabs"><button className={compareMode==='pin'?'active':''} onClick={()=>setCompareMode('pin')}>Pin & compare</button><button className={compareMode==='grid'?'active':''} onClick={()=>setCompareMode('grid')}>Grid</button></div>
        {compareMode==='pin'?<div className="space-y-4">
          <div className="split-compare"><ComparePane title="Pinned" style={pinned} src={preview} pinned/><ComparePane title={`${compareIndex+1} of ${alternatives.length}`} style={compareStyle} src={preview} alt/></div>
          <div className="flex items-center justify-between gap-3"><button className="btn-soft" onClick={()=>setCompareIndex(i=>(i-1+alternatives.length)%alternatives.length)}>← Previous</button><div className="text-center text-sm"><b>{pinned}</b> vs <b>{compareStyle}</b></div><button className="btn-soft" onClick={()=>setCompareIndex(i=>(i+1)%alternatives.length)}>Next →</button></div>
          <div className="grid grid-cols-2 gap-3"><button className="btn-primary" onClick={()=>chooseWinner(pinned)}>Choose {pinned}</button><button className="btn-primary" onClick={()=>chooseWinner(compareStyle)}>Choose {compareStyle}</button></div>
          <div><div className="label">Change pinned style</div><div className="flex gap-2 overflow-x-auto pb-2">{selected.map(s=><button key={s} className={`chip whitespace-nowrap ${s===pinned?'bg-black text-white':''}`} onClick={()=>{setPinned(s);setCompareIndex(0)}}>{s}</button>)}</div></div>
        </div>:<div className="space-y-4"><div className="compare-grid">{selected.map((s,i)=><button key={s} className="compare-grid-card" onClick={()=>chooseWinner(s)}><StyleImage src={preview} style={s} index={i}/><div className="p-3 text-left"><b>{s}</b><div className="text-xs text-stone-500 mt-1">Tap to choose</div></div></button>)}</div></div>}
      </>}
    </section>}

    {step===3&&<form onSubmit={submit} className="card p-5 md:p-7 space-y-5">
      <div className="flex items-start justify-between gap-3"><div><div className="kicker">03 · Make it yours</div><h2 className="text-3xl font-semibold mt-1">Build the {form.style||pinned} version.</h2><p className="text-stone-600 mt-2">Now refine color, budget and what should stay.</p></div><button type="button" className="btn-soft text-sm" onClick={()=>setStep(2)}>Compare again</button></div>
      <div className="winner-strip"><StyleImage src={preview} style={form.style||pinned} index={0}/><div><div className="text-xs uppercase tracking-wider text-stone-500">Selected style</div><div className="text-xl font-semibold">{form.style||pinned}</div></div></div>
      <div className="grid md:grid-cols-2 gap-5"><Field label="Color palette"><select className="input" value={form.color_palette} onChange={e=>setForm({...form,color_palette:e.target.value})}>{PALETTES.map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Exact budget ($)"><input className="input" type="number" min="50" step="10" value={form.budget} onChange={e=>setForm({...form,budget:Number(e.target.value)})}/></Field><Field label="Budget mode"><select className="input" value={form.budget_mode} onChange={e=>setForm({...form,budget_mode:e.target.value})}><option value="save">Save</option><option value="balanced">Balanced</option><option value="premium">Premium</option></select></Field><Field label="Keep these items"><textarea className="input min-h-24" value={form.keep_items} onChange={e=>setForm({...form,keep_items:e.target.value})} placeholder="Keep my bed and flooring"/></Field><Field label="Replace these items"><textarea className="input min-h-24" value={form.replace_items} onChange={e=>setForm({...form,replace_items:e.target.value})} placeholder="Replace rug, lamps, curtains"/></Field><Field label="Extra instructions"><textarea className="input min-h-24" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Add flowers, warm lighting, easy-clean fabrics..."/></Field></div>
      {error&&<p className="text-red-700 text-sm">{error}</p>}
      <button disabled={busy} className="btn-primary w-full">{busy?'Designing your room…':DEMO_MODE?'Preview shoppable design':'Generate shoppable design'}</button>
    </form>}
  </div>
}

function Progress({step}:{step:number}){return <div className="flow-progress">{[1,2,3].map(n=><i key={n} className={n<=step?'on':''}></i>)}</div>}
function Field({label,children}:{label:string,children:React.ReactNode}){return <div><label className="label">{label}</label>{children}</div>}
function ComparePane({title,style,src,pinned,alt}:{title:string;style:string;src:string;pinned?:boolean;alt?:boolean}){return <div className="compare-pane"><div className="compare-pane-head"><span>{title}</span>{pinned&&<b>📌</b>}</div><StyleImage src={src} style={style} index={alt?3:0}/><div className="p-3"><div className="font-semibold">{style}</div><div className="text-xs text-stone-500 mt-1">{styleMood[style]||'Curated interior style'}</div></div></div>}
function StyleImage({src,style,index}:{src:string;style:string;index:number}){return <div className={`style-image filter-${Math.abs((style.length+index)%6)}`}>{src?<img src={src} alt={`${style} room preview`}/>:<div className="placeholder-room"></div>}<span>{style}</span></div>}
async function compressImage(file:File){return await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onerror=()=>reject(r.error);r.onload=()=>{const img=new Image();img.onerror=()=>reject(new Error('Could not read image'));img.onload=()=>{const max=1200,scale=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);const ctx=c.getContext('2d');if(!ctx)return reject(new Error('Canvas unavailable'));ctx.drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL('image/jpeg',.72))};img.src=String(r.result)};r.readAsDataURL(file)})}
