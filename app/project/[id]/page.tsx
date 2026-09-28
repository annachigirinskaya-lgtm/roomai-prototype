import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect, notFound } from 'next/navigation';
import ProductGrid from '@/components/ProductGrid';
import EditSavedDesign from '@/components/EditSavedDesign';

export default async function Page({params}:{params:Promise<{id:string}>}){
  const {id}=await params;const s=await createClient();const {data:{user}}=await s.auth.getUser();if(!user)redirect('/auth');
  const {data:project}=await s.from('projects').select('*').eq('id',id).eq('user_id',user.id).single();if(!project)notFound();
  const {data:rows}=await s.from('designs').select('*').eq('project_id',id).eq('user_id',user.id).order('created_at',{ascending:true});
  const admin=createAdminClient();
  const designs=await Promise.all((rows||[]).map(async design=>{const {data}=design.generated_image_path?await admin.storage.from('generated-designs').createSignedUrl(design.generated_image_path,60*60*24):{data:null};const style=styleFromPrompt(design.prompt)||project.style;return {...design,style,generated_image_url:data?.signedUrl||design.generated_image_url}}));
  const chosen=designs.find(x=>x.style===project.style)||designs[designs.length-1];
  const {data:profile}=await s.from('profiles').select('plan').eq('id',user.id).single();
  const canEdit=profile?.plan&&profile.plan!=='free';
  let products:any[]=[];if(chosen){const {data}=await s.from('design_products').select('*').eq('design_id',chosen.id);products=data||[]}
  return <div className="space-y-8"><section className="card p-6"><div className="text-sm text-stone-500">{project.room_type}</div><h1 className="text-3xl font-semibold mt-1">{project.name}</h1><p className="text-stone-600 mt-2">Selected: <b>{project.style}</b> · {project.color_palette} · Budget ${Number(project.budget).toLocaleString()}</p><p className="text-sm text-stone-500 mt-2">{designs.length} AI result{designs.length===1?'':'s'} saved in this project.</p></section>
    {chosen?.generated_image_url?<section><div className="flex items-end justify-between gap-4 mb-4"><div><div className="kicker">Selected design</div><h2 className="text-2xl font-semibold">{chosen.style}</h2></div><a className="btn-soft" href={chosen.generated_image_url} download>Save image</a></div><img className="w-full rounded-3xl border border-stone-200" src={chosen.generated_image_url} alt={`AI-generated ${chosen.style} room design`}/>{canEdit&&<div className="mt-4"><EditSavedDesign imageUrl={chosen.generated_image_url} style={chosen.style} name={project.name} colorPalette={project.color_palette}/></div>}</section>:<div className="card p-6">No generated design yet.</div>}
    {designs.length>1&&<section><h2 className="text-2xl font-semibold mb-4">Saved comparison</h2><div className="compare-grid">{designs.map(design=><div className={`compare-grid-card ${design.id===chosen?.id?'selected-result':''}`} key={design.id}><img className="w-full aspect-[4/3] object-cover" src={design.generated_image_url} alt={`Saved AI-generated ${design.style} room`}/><div className="p-3"><b>{design.style}</b>{design.id===chosen?.id&&<div className="text-xs text-stone-500">Selected</div>}</div></div>)}</div></section>}
    {products.length>0&&<section><h2 className="text-2xl font-semibold mb-2">Shop this room</h2><p className="text-stone-600 mb-5">Product candidates selected for the style and budget. Retailer feeds remain clearly separate from AI generation.</p><ProductGrid products={products}/></section>}
  </div>
}
function styleFromPrompt(prompt:string|null){return prompt?.match(/Style: ([^.]+)\./)?.[1]||''}
