'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ROOM_TYPES, STYLES, PALETTES, STYLE_META } from '@/lib/catalog';
import { useRouter } from 'next/navigation';
import { saveLocalDesign } from '@/lib/local-designs';
import BetaFeedback from '@/components/BetaFeedback';

const BETA_CONFIGURED=process.env.NEXT_PUBLIC_ROOMAI_BETA_MODE==='true';
const ACCOUNT_MODE=Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
const MIN_STYLES=4,MAX_STYLES=6;
type Result={id:string;style:string;generated_image_url:string;local?:boolean};
type GenerationPhase='waiting'|'generating'|'done'|'failed';
type GenerationState=Record<string,{phase:GenerationPhase;message?:string}>;

export default function ProjectForm(){
  const router=useRouter();
  const [step,setStep]=useState<1|2>(1);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [file,setFile]=useState<File|null>(null);
  const [preview,setPreview]=useState('');
  const [selected,setSelected]=useState<string[]>(['Modern','Luxury','Boho','Old Money','Hollywood Regency','Japandi']);
  const [results,setResults]=useState<Result[]>([]);
  const [projectId,setProjectId]=useState('');
  const [pinned,setPinned]=useState('Modern');
  const [compareIndex,setCompareIndex]=useState(0);
  const [compareMode,setCompareMode]=useState<'pin'|'grid'>('grid');
  const [generation,setGeneration]=useState<GenerationState>({});
  const [betaMode,setBetaMode]=useState(BETA_CONFIGURED);
  const [betaAccess,setBetaAccess]=useState(!BETA_CONFIGURED);
  const objectUrls=useRef<string[]>([]);
  const betaToken=useRef('');
  const [form,setForm]=useState({name:'My room',room_type:'Living Room',style:'Modern',color_palette:'Warm White',custom_colors:'',budget:1500,budget_mode:'balanced',keep_items:'',replace_items:'',notes:''});
  const alternatives=useMemo(()=>results.filter(x=>x.style!==pinned),[results,pinned]);
  const pinnedResult=results.find(x=>x.style===pinned)||results[0];
  const compareResult=alternatives[Math.min(compareIndex,Math.max(0,alternatives.length-1))];
  const failedStyles=selected.filter(style=>generation[style]?.phase==='failed');
  const localMode=betaMode||!ACCOUNT_MODE;

  useEffect(()=>{
    const automaticPreview=window.location.hostname.includes('-git-')&&window.location.hostname.endsWith('.vercel.app');
    if(automaticPreview){setBetaMode(true);setBetaAccess(true)}
    else if(BETA_CONFIGURED){
      const url=new URL(window.location.href);
      const invitation=url.searchParams.get('beta')||sessionStorage.getItem('roomai-beta-token')||'';
      if(invitation){
        betaToken.current=invitation;sessionStorage.setItem('roomai-beta-token',invitation);setBetaAccess(true);
        if(url.searchParams.has('beta')){url.searchParams.delete('beta');window.history.replaceState({},'',`${url.pathname}${url.search}${url.hash}`)}
      }else setError('Open the private beta invitation link to start generating designs.');
    }
    return()=>objectUrls.current.forEach(url=>URL.revokeObjectURL(url));
  },[]);

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
  function setStylePhase(style:string,phase:GenerationPhase,message?:string){
    setGeneration(current=>({...current,[style]:{phase,message}}));
  }
  async function generateLocalStyles(styles:string[],uploadFile:File){
    const completed:Result[]=[];const failures:{style:string;message:string}[]=[];
    for(let i=0;i<styles.length;i+=2){
      const batch=styles.slice(i,i+2);
      batch.forEach(style=>setStylePhase(style,'generating'));
      const generated=await Promise.allSettled(batch.map(async style=>{
        const body=new FormData();body.append('image',uploadFile);body.append('project',JSON.stringify({...form,budget:Number(form.budget),style,source_image_url:''}));body.append('comparisonStyles',JSON.stringify(selected));
        const response=await fetch('/api/designs/quick-generate',{method:'POST',headers:betaToken.current?{'x-roomai-beta-token':betaToken.current}:{},body});
        if(!response.ok){let message='Could not generate this style.';try{message=(await response.json()).error||message}catch{}throw new Error(message)}
        const image=await response.blob();const id=crypto.randomUUID();
        await saveLocalDesign({id,style,createdAt:Date.now(),project:{...form,comparedStyles:selected},image});
        const generatedImageUrl=URL.createObjectURL(image);objectUrls.current.push(generatedImageUrl);
        return {id,style,generated_image_url:generatedImageUrl,local:true} satisfies Result;
      }));
      generated.forEach((result,index)=>{
        const style=batch[index];
        if(result.status==='fulfilled'){
          completed.push(result.value);setStylePhase(style,'done');
          setResults(current=>[...current.filter(item=>item.style!==style),result.value]);
        }else{
          const message=result.reason?.message||'Generation failed.';
          failures.push({style,message});setStylePhase(style,'failed',message);
        }
      });
    }
    return {completed,failures};
  }
  async function generateComparison(){
    if(!file)return setError('Upload a room photo first.');
    if(selected.length<MIN_STYLES||selected.length>MAX_STYLES)return setError('Choose 4–6 styles.');
    setBusy(true);setError('');
    setResults([]);setGeneration(Object.fromEntries(selected.map(style=>[style,{phase:'waiting'}])));
    try{
      const uploadFile=preview?dataUrlToFile(preview,'room.jpg'):file;
      if(localMode){
        const {completed,failures}=await generateLocalStyles(selected,uploadFile);
        if(!completed.length&&failures.some(x=>x.message.includes('OpenAI is not connected')))throw new Error('OpenAI generation is not connected in Vercel yet. Add OPENAI_API_KEY in Environment Variables, then redeploy.');
        if(!completed.length)throw new Error(failures[0]?.message||'No AI designs were generated.');
        setResults(completed);setPinned(completed[0].style);setStep(2);window.scrollTo({top:0,behavior:'smooth'});
        if(failures.length)setError(`Generated ${completed.length} of ${selected.length} styles. Retry the failed ${failures.length===1?'style':'styles'} below.`);
        return;
      }
      selected.forEach(style=>setStylePhase(style,'generating'));
      const s=createClient();const {data:{user}}=await s.auth.getUser();if(!user)throw new Error('Please sign in before generating designs.');
      const path=`${user.id}/${crypto.randomUUID()}.jpg`;
      const up=await s.storage.from('room-images').upload(path,uploadFile,{contentType:'image/jpeg',upsert:false});if(up.error)throw up.error;
      const pr=await fetch('/api/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,budget:Number(form.budget),style:selected[0],source_image_path:path})});
      const project=await pr.json();if(!pr.ok)throw new Error(project.error||'Could not save the room.');setProjectId(project.id);
      const gr=await fetch('/api/designs/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId:project.id,styles:selected,mode:'standard_design'})});
      const generated=await gr.json();if(!gr.ok)throw new Error(generated.error||'Could not generate the comparison.');
      const returnedStyles=new Set<string>(generated.designs.map((design:Result)=>design.style));
      selected.forEach(style=>setStylePhase(style,returnedStyles.has(style)?'done':'failed',returnedStyles.has(style)?undefined:'This style did not finish.'));
      setResults(generated.designs);setPinned(generated.designs[0]?.style||selected[0]);setStep(2);window.scrollTo({top:0,behavior:'smooth'});
      if(generated.partial)setError('Some variants could not be generated. The completed results were saved.');
    }catch(e:any){setError(typeof e?.message==='string'?e.message:'Something went wrong.')}finally{setBusy(false)}
  }
  async function retryFailed(){
    if(!file||!failedStyles.length||!localMode)return;
    setBusy(true);setError('');
    try{
      const uploadFile=preview?dataUrlToFile(preview,'room.jpg'):file;
      const {completed,failures}=await generateLocalStyles(failedStyles,uploadFile);
      if(completed.length&&!pinnedResult)setPinned(completed[0].style);
      if(failures.length)setError(`${failures.length} ${failures.length===1?'style still needs':'styles still need'} another try.`);
    }catch(reason){setError(reason instanceof Error?reason.message:'Could not retry these styles.')}finally{setBusy(false)}
  }
  async function chooseWinner(result:Result){
    if(localMode){router.push(`/local-result?id=${encodeURIComponent(result.id)}`);return}
    setBusy(true);setError('');
    try{const response=await fetch('/api/projects',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId,style:result.style})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not save your choice.');router.push(`/project/${projectId}`);router.refresh()}catch(e:any){setError(e.message)}finally{setBusy(false)}
  }

  return <div className="space-y-5">
    <div className="flow-progress">{[1,2].map(n=><i key={n} className={n<=step?'on':''}/>)}</div>
    {step===1&&<section className="card p-5 md:p-7 space-y-6">

      <div><h1 className="text-2xl md:text-3xl font-semibold">Upload your room photo</h1><p className="text-stone-600 mt-1 text-sm">Choose up to six styles and compare real AI designs.</p></div>
      <label className={`room-upload ${preview?'has-image':''}`}>{preview?<img src={preview} alt="Uploaded room"/>:<div className="text-center"><div className="text-4xl">＋</div><b>Add your room photo</b><div className="text-sm text-stone-500 mt-1">JPG, PNG, HEIC or WebP · up to 20 MB</div></div>}<input className="sr-only" type="file" accept="image/*" onChange={e=>onFile(e.target.files?.[0]||null)}/>{preview&&<span className="upload-chip">Change photo</span>}</label>
      <div className="grid md:grid-cols-2 gap-4"><Field label="Project name"><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label="Room type"><select className="input" value={form.room_type} onChange={e=>setForm({...form,room_type:e.target.value})}>{ROOM_TYPES.map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Color palette"><select className="input" value={form.color_palette} onChange={e=>setForm({...form,color_palette:e.target.value})}>{PALETTES.map(x=><option key={x}>{x}</option>)}</select></Field>{form.color_palette==='Custom'&&<Field label="Your colors"><input className="input" value={form.custom_colors} onChange={e=>setForm({...form,custom_colors:e.target.value})} placeholder="Cream, walnut, olive…"/></Field>}<Field label="Budget ($)"><input className="input" type="number" min="50" step="10" value={form.budget} onChange={e=>setForm({...form,budget:Number(e.target.value)})}/></Field><Field label="Keep these items"><textarea className="input min-h-24" value={form.keep_items} onChange={e=>setForm({...form,keep_items:e.target.value})} placeholder="Sofa, flooring, fireplace…"/></Field><Field label="Replace or add"><textarea className="input min-h-24" value={form.replace_items} onChange={e=>setForm({...form,replace_items:e.target.value})} placeholder="Furniture, lighting, curtains…"/></Field></div>
      <div><div className="flex items-end justify-between gap-3"><div><div className="label mb-1">Choose 4–6 styles</div><p className="text-sm text-stone-500">{selected.length} selected · these photos are style references, not generated results.</p></div><button type="button" className="text-sm underline" onClick={()=>setSelected(STYLES.slice(0,6))}>Select first 6</button></div><div className="style-grid mt-4">{STYLES.map(style=><button type="button" key={style} onClick={()=>toggleStyle(style)} className={`style-card ${selected.includes(style)?'selected':''}`}><img className="style-photo" src={STYLE_META[style].image} alt={`${style} style reference`}/><div className="p-3"><div className="flex items-center justify-between gap-2"><b>{style}</b>{selected.includes(style)&&<span className="check">✓</span>}</div><div className="text-xs text-stone-500 mt-1">{STYLE_META[style].mood}</div><div className="text-[11px] leading-snug text-stone-500 mt-2 line-clamp-3">{STYLE_META[style].guidance}</div><div className="inspiration-label">Style reference</div></div></button>)}</div></div>
      {error&&<p className="text-red-700 text-sm" role="alert">{error}</p>}
      <button type="button" disabled={busy||!betaAccess} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50" onClick={generateComparison}>{busy?'Generating and saving your room designs…':`Generate ${selected.length} AI designs`}</button>
      {Object.keys(generation).length>0&&<GenerationProgress styles={selected} generation={generation}/>}
      <p className="text-xs text-center text-stone-500">{localMode?'Prototype results are saved on this device. Each selected style creates a real AI edit of your uploaded room.':'Generated results are saved to your project. Free plan: 1 credit per variant; paid plans include standard redesigns.'}</p>
    </section>}
    {step===2&&<section className="card p-5 md:p-7 space-y-6">
      <div className="flex items-start justify-between gap-3"><div><div className="kicker">02 · Compare</div><h2 className="text-3xl font-semibold mt-1">Choose the version that feels right.</h2><p className="text-stone-600 mt-2">These AI designs were generated from your uploaded room and saved {localMode?'on this device':'with your project'}.</p></div><button className="btn-soft text-sm" onClick={()=>setStep(1)}>Edit</button></div>
      <div className="compare-tabs"><button className={compareMode==='grid'?'active':''} onClick={()=>setCompareMode('grid')}>4–6 grid</button><button className={compareMode==='pin'?'active':''} onClick={()=>setCompareMode('pin')}>Pin & compare</button></div>
      {compareMode==='grid'?<div className="compare-grid">{results.map(result=><button key={result.id} className="compare-grid-card" onClick={()=>chooseWinner(result)} disabled={busy}><ResultImage result={result}/><div className="p-3 text-left"><b>{result.style}</b><div className="text-xs text-stone-500 mt-1">Tap to choose and save</div></div></button>)}</div>:<div className="space-y-4"><div className="split-compare">{pinnedResult&&<ResultPane title="Pinned" result={pinnedResult}/>} {compareResult&&<ResultPane title={`${compareIndex+1} of ${alternatives.length}`} result={compareResult}/>}</div><div className="flex items-center justify-between gap-3"><button className="btn-soft" onClick={()=>setCompareIndex(i=>(i-1+alternatives.length)%alternatives.length)}>←</button><div className="text-sm text-center"><b>{pinnedResult?.style}</b> vs <b>{compareResult?.style}</b></div><button className="btn-soft" onClick={()=>setCompareIndex(i=>(i+1)%alternatives.length)}>→</button></div><div className="grid grid-cols-2 gap-3"><button className="btn-primary" onClick={()=>pinnedResult&&chooseWinner(pinnedResult)}>Choose {pinnedResult?.style}</button><button className="btn-primary" onClick={()=>compareResult&&chooseWinner(compareResult)}>Choose {compareResult?.style}</button></div><div className="flex gap-2 overflow-x-auto pb-2">{results.map(result=><button key={result.id} className={`chip whitespace-nowrap ${result.style===pinned?'bg-black text-white':''}`} onClick={()=>{setPinned(result.style);setCompareIndex(0)}}>{result.style}</button>)}</div></div>}
      {Object.keys(generation).length>0&&<GenerationProgress styles={selected} generation={generation}/>}
      {localMode&&failedStyles.length>0&&<button type="button" className="btn-soft w-full" disabled={busy} onClick={retryFailed}>{busy?'Retrying failed styles…':`Retry ${failedStyles.length} failed ${failedStyles.length===1?'style':'styles'}`}</button>}
      {error&&<p className="text-red-700 text-sm" role="alert">{error}</p>}
      <BetaFeedback context="Style comparison"/>
    </section>}
  </div>
}

function Field({label,children}:{label:string;children:React.ReactNode}){return <div><label className="label">{label}</label>{children}</div>}
function ResultImage({result}:{result:Result}){return <div className="result-image"><img src={result.generated_image_url} alt={`AI-generated ${result.style} version of the uploaded room`}/><span>AI RESULT · YOUR ROOM</span></div>}
function ResultPane({title,result}:{title:string;result:Result}){return <div className="compare-pane"><div className="compare-pane-head"><span>{title}</span></div><ResultImage result={result}/><div className="p-3 font-semibold">{result.style}</div></div>}
function GenerationProgress({styles,generation}:{styles:string[];generation:GenerationState}){
  const finished=styles.filter(style=>generation[style]?.phase==='done').length;
  return <div className="generation-progress" aria-live="polite"><div className="flex items-center justify-between gap-3"><b>Creating your comparison</b><span>{finished} of {styles.length} ready</span></div><div className="generation-list">{styles.map(style=>{const phase=generation[style]?.phase||'waiting';return <div className={`generation-item ${phase}`} key={style}><i aria-hidden="true"/><span>{style}</span><small>{phase==='waiting'?'Waiting':phase==='generating'?'Creating…':phase==='done'?'Ready':'Try again'}</small></div>})}</div></div>
}
async function compressImage(file:File){return await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(reader.error);reader.onload=()=>{const img=new Image();img.onerror=()=>reject(new Error('Could not read image'));img.onload=()=>{const max=1600,scale=Math.min(1,max/Math.max(img.width,img.height));const canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);const context=canvas.getContext('2d');if(!context)return reject(new Error('Canvas unavailable'));context.drawImage(img,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL('image/jpeg',.82))};img.src=String(reader.result)};reader.readAsDataURL(file)})}
function dataUrlToFile(dataUrl:string,name:string){const [meta,data]=dataUrl.split(',');const mime=meta.match(/data:(.*?);/)?.[1]||'image/jpeg';const bytes=atob(data);const array=new Uint8Array(bytes.length);for(let i=0;i<bytes.length;i++)array[i]=bytes.charCodeAt(i);return new File([array],name,{type:mime})}
