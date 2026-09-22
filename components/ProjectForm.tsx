'use client';
import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ROOM_TYPES, STYLES, PALETTES, STYLE_META } from '@/lib/catalog';
import { useRouter } from 'next/navigation';

const DEMO_MODE=!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const MIN_STYLES=4,MAX_STYLES=6;
type Result={id:string;style:string;generated_image_url:string};

export default function ProjectForm(){
  const router=useRouter();
  const [step,setStep]=useState<1|2>(1);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [file,setFile]=useState<File|null>(null);
  const [preview,setPreview]=useState('');
  const [selected,setSelected]=useState<string[]>(['Modern','Luxury','Japandi','Old Money']);
  const [results,setResults]=useState<Result[]>([]);
  const [projectId,setProjectId]=useState('');
  const [pinned,setPinned]=useState('Modern');
  const [compareIndex,setCompareIndex]=useState(0);
  const [compareMode,setCompareMode]=useState<'pin'|'grid'>('grid');
  const [form,setForm]=useState({name:'My room',room_type:'Living Room',style:'Modern',color_palette:'Warm White',custom_colors:'',budget:1500,budget_mode:'balanced',keep_items:'',replace_items:'',notes:''});
  const alternatives=useMemo(()=>results.filter(x=>x.style!==pinned),[results,pinned]);
  const pinnedResult=results.find(x=>x.style===pinned)||results[0];
  const compareResult=alternatives[Math.min(compareIndex,Math.max(0,alternatives.length-1))];

  async function onFile(next:File|null){
    setFile(next);setError('');if(!next){setPreview('');return}
    if(!next.type.startsWith('image/')){setError('Choose a JPG, PNG, HEIC or WebP photo.');return}
    if(next.size>20*1024*1024){setError('The photo must be smaller than 20 MB.');return}
    try{setPreview(await compressImage(next))}catch{setPreview(URL.createObjectURL(next))}
  }
  function toggleStyle(style:string){
    setError('');setSelected(current=>{
      if(current.includes(style)){if(current.length<=MIN_STYLES){setError(`Choose at least ${MIN_STYLES} styles.`);return current}return current.filter(x=>x!==style)}
      if(current.length>=MAX_STYLES){setError(`Choose up to ${MAX_STYLES} styles.`);return current}
      return [...current,style];
    });
  }
  async function generateComparison(){
    if(!file)return setError('Upload a room photo first.');
    if(selected.length<MIN_STYLES||selected.length>MAX_STYLES)return setError('Choose 4–6 styles.');
    setBusy(true);setError('');
    try{
      if(DEMO_MODE){
        localStorage.setItem('roomai_demo_project',JSON.stringify({...form,previewImage:preview,comparedStyles:selected,demo:true}));
        setResults(selected.map((style,i)=>({id:`inspiration-${i}`,style,generated_image_url:STYLE_META[style].image})));
        setPinned(selected[0]);setStep(2);window.scrollTo({top:0,behavior:'smooth'});return;
      }
      const s=createClient();const {data:{user}}=await s.auth.getUser();if(!user)throw new Error('Please sign in before generating designs.');
      const ext=(file.name.split('.').pop()||'jpg').toLowerCase();const path=`${user.id}/${crypto.randomUUID()}.${ext}`;
      const up=await s.storage.from('room-images').upload(path,file,{contentType:file.type||'image/jpeg',upsert:false});if(up.error)throw up.error;
      const pr=await fetch('/api/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,budget:Number(form.budget),style:selected[0],source_image_path:path})});
      const project=await pr.json();if(!pr.ok)throw new Error(project.error||'Could not save the room.');setProjectId(project.id);
      const gr=await fetch('/api/designs/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId:project.id,styles:selected,mode:'standard_design'})});
      const generated=await gr.json();if(!gr.ok)throw new Error(generated.error||'Could not generate the comparison.');
      setResults(generated.designs);setPinned(generated.designs[0]?.style||selected[0]);setStep(2);window.scrollTo({top:0,behavior:'smooth'});
      if(generated.partial)setError('Some variants could not be generated. The completed results were saved.');
    }catch(e:any){setError(typeof e?.message==='string'?e.message:'Something went wrong.')}finally{setBusy(false)}
  }
  async function chooseWinner(style:string){
    if(DEMO_MODE){localStorage.setItem('roomai_demo_winner',style);router.push('/demo-result');return}
    setBusy(true);setError('');
    try{const response=await fetch('/api/projects',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId,style})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not save your choice.');router.push(`/project/${projectId}`);router.refresh()}catch(e:any){setError(e.message)}finally{setBusy(false)}
  }

  return <div className="space-y-5">
    <div className="flow-progress">{[1,2].map(n=><i key={n} className={n<=step?'on':''}/>)}</div>
    {step===1&&<section className="card p-5 md:p-7 space-y-6">
      {DEMO_MODE&&<div className="notice"><b>Preview mode:</b> the 25 style photos below are inspiration photographs, not AI results. Live comparisons are produced only after Supabase and the OpenAI API are connected.</div>}
      <div><div className="kicker">01 · Your room</div><h2 className="text-3xl font-semibold mt-1">Upload once. Generate 4–6 real versions.</h2><p className="text-stone-600 mt-2">Every AI variant uses your uploaded room as the image input and preserves its architecture.</p></div>
      <label className={`room-upload ${preview?'has-image':''}`}>{preview?<img src={preview} alt="Uploaded room"/>:<div className="text-center"><div className="text-4xl">＋</div><b>Add your room photo</b><div className="text-sm text-stone-500 mt-1">JPG, PNG, HEIC or WebP · up to 20 MB</div></div>}<input className="sr-only" type="file" accept="image/*" onChange={e=>onFile(e.target.files?.[0]||null)}/>{preview&&<span className="upload-chip">Change photo</span>}</label>
      <div className="grid md:grid-cols-2 gap-4"><Field label="Project name"><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label="Room type"><select className="input" value={form.room_type} onChange={e=>setForm({...form,room_type:e.target.value})}>{ROOM_TYPES.map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Color palette"><select className="input" value={form.color_palette} onChange={e=>setForm({...form,color_palette:e.target.value})}>{PALETTES.map(x=><option key={x}>{x}</option>)}</select></Field>{form.color_palette==='Custom'&&<Field label="Your colors"><input className="input" value={form.custom_colors} onChange={e=>setForm({...form,custom_colors:e.target.value})} placeholder="Cream, walnut, olive…"/></Field>}<Field label="Budget ($)"><input className="input" type="number" min="50" step="10" value={form.budget} onChange={e=>setForm({...form,budget:Number(e.target.value)})}/></Field><Field label="Keep these items"><textarea className="input min-h-24" value={form.keep_items} onChange={e=>setForm({...form,keep_items:e.target.value})} placeholder="Sofa, flooring, fireplace…"/></Field><Field label="Replace or add"><textarea className="input min-h-24" value={form.replace_items} onChange={e=>setForm({...form,replace_items:e.target.value})} placeholder="Furniture, lighting, curtains…"/></Field></div>
      <div><div className="flex items-end justify-between gap-3"><div><div className="label mb-1">Choose 4–6 styles</div><p className="text-sm text-stone-500">{selected.length} selected · these photos show style direction only.</p></div><button type="button" className="text-sm underline" onClick={()=>setSelected(STYLES.slice(0,6))}>Select first 6</button></div><div className="style-grid mt-4">{STYLES.map(style=><button type="button" key={style} onClick={()=>toggleStyle(style)} className={`style-card ${selected.includes(style)?'selected':''}`}><img className="style-photo" src={STYLE_META[style].image} alt={`${style} style inspiration`}/><div className="p-3"><div className="flex items-center justify-between gap-2"><b>{style}</b>{selected.includes(style)&&<span className="check">✓</span>}</div><div className="text-xs text-stone-500 mt-1">{STYLE_META[style].mood}</div><div className="inspiration-label">Inspiration photo</div></div></button>)}</div></div>
      {error&&<p className="text-red-700 text-sm" role="alert">{error}</p>}
      <button type="button" disabled={busy} className="btn-primary w-full" onClick={generateComparison}>{busy?'Generating and saving your room designs…':DEMO_MODE?'Preview selected style directions':`Generate ${selected.length} AI designs`}</button>
      {!DEMO_MODE&&<p className="text-xs text-center text-stone-500">Generated results are saved to your project. Free plan: 1 credit per variant; paid plans include standard redesigns.</p>}
    </section>}
    {step===2&&<section className="card p-5 md:p-7 space-y-6">
      <div className="flex items-start justify-between gap-3"><div><div className="kicker">02 · Compare</div><h2 className="text-3xl font-semibold mt-1">Choose the version that feels right.</h2><p className="text-stone-600 mt-2">{DEMO_MODE?'These are labeled inspiration photos, not generated designs.':'These AI designs were generated from and saved with your uploaded room.'}</p></div><button className="btn-soft text-sm" onClick={()=>setStep(1)}>Edit</button></div>
      <div className="compare-tabs"><button className={compareMode==='grid'?'active':''} onClick={()=>setCompareMode('grid')}>4–6 grid</button><button className={compareMode==='pin'?'active':''} onClick={()=>setCompareMode('pin')}>Pin & compare</button></div>
      {compareMode==='grid'?<div className="compare-grid">{results.map(result=><button key={result.id} className="compare-grid-card" onClick={()=>chooseWinner(result.style)} disabled={busy}><ResultImage result={result} demo={DEMO_MODE}/><div className="p-3 text-left"><b>{result.style}</b><div className="text-xs text-stone-500 mt-1">Tap to choose and save</div></div></button>)}</div>:<div className="space-y-4"><div className="split-compare">{pinnedResult&&<ResultPane title="Pinned" result={pinnedResult} demo={DEMO_MODE}/>} {compareResult&&<ResultPane title={`${compareIndex+1} of ${alternatives.length}`} result={compareResult} demo={DEMO_MODE}/>}</div><div className="flex items-center justify-between gap-3"><button className="btn-soft" onClick={()=>setCompareIndex(i=>(i-1+alternatives.length)%alternatives.length)}>←</button><div className="text-sm text-center"><b>{pinnedResult?.style}</b> vs <b>{compareResult?.style}</b></div><button className="btn-soft" onClick={()=>setCompareIndex(i=>(i+1)%alternatives.length)}>→</button></div><div className="grid grid-cols-2 gap-3"><button className="btn-primary" onClick={()=>pinnedResult&&chooseWinner(pinnedResult.style)}>Choose {pinnedResult?.style}</button><button className="btn-primary" onClick={()=>compareResult&&chooseWinner(compareResult.style)}>Choose {compareResult?.style}</button></div><div className="flex gap-2 overflow-x-auto pb-2">{results.map(result=><button key={result.id} className={`chip whitespace-nowrap ${result.style===pinned?'bg-black text-white':''}`} onClick={()=>{setPinned(result.style);setCompareIndex(0)}}>{result.style}</button>)}</div></div>}
      {error&&<p className="text-red-700 text-sm" role="alert">{error}</p>}
    </section>}
  </div>
}

function Field({label,children}:{label:string;children:React.ReactNode}){return <div><label className="label">{label}</label>{children}</div>}
function ResultImage({result,demo}:{result:Result;demo:boolean}){return <div className="result-image"><img src={result.generated_image_url} alt={demo?`${result.style} inspiration photograph`:`AI-generated ${result.style} version of the uploaded room`}/><span>{demo?'INSPIRATION · NOT AI':'AI RESULT'}</span></div>}
function ResultPane({title,result,demo}:{title:string;result:Result;demo:boolean}){return <div className="compare-pane"><div className="compare-pane-head"><span>{title}</span></div><ResultImage result={result} demo={demo}/><div className="p-3 font-semibold">{result.style}</div></div>}
async function compressImage(file:File){return await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(reader.error);reader.onload=()=>{const img=new Image();img.onerror=()=>reject(new Error('Could not read image'));img.onload=()=>{const max=1600,scale=Math.min(1,max/Math.max(img.width,img.height));const canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);const context=canvas.getContext('2d');if(!context)return reject(new Error('Canvas unavailable'));context.drawImage(img,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL('image/jpeg',.82))};img.src=String(reader.result)};reader.readAsDataURL(file)})}
