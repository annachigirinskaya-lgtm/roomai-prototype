import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildShoppingList } from '@/services/product-matcher';
import { designPrompt, generateFromRoom } from '@/services/ai-image';
import { CREDIT_COSTS } from '@/lib/catalog';

export async function POST(req:NextRequest){
 const s=await createClient(); const {data:{user}}=await s.auth.getUser(); if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
 const {projectId,mode='shoppable_design'}=await req.json() as {projectId:string,mode?:keyof typeof CREDIT_COSTS};
 const {data:project,error:pErr}=await s.from('projects').select('*').eq('id',projectId).eq('user_id',user.id).single(); if(pErr||!project)return NextResponse.json({error:'Project not found'},{status:404});
 const admin=createAdminClient();
 const {data:profile}=await admin.from('profiles').select('*').eq('id',user.id).single();
 const plan=profile?.plan||'free';
 // Standard redesigns are included on paid plans; Free users spend 1 credit each.
 const cost=mode==='standard_design' && plan!=='free' ? 0 : (CREDIT_COSTS[mode]??CREDIT_COSTS.shoppable_design);
 const subscriptionCredits=profile?.subscription_credits||0; const purchasedCredits=profile?.purchased_credits||0; const totalCredits=subscriptionCredits+purchasedCredits;
 if(totalCredits<cost)return NextResponse.json({error:'Not enough premium credits. Buy a top-up or choose a basic redesign.',credits_needed:cost,credits_available:totalCredits},{status:402});

 const products=mode==='standard_design' ? [] : await buildShoppingList({...project,source_image_url:project.source_image_url||''});
 const total=products.reduce((n,x)=>n+x.price,0);
 const {data:file,error:fErr}=await admin.storage.from('room-images').download(project.source_image_path); if(fErr||!file)return NextResponse.json({error:'Could not read source image'},{status:500});
 let output:Buffer; try{output=await generateFromRoom(Buffer.from(await file.arrayBuffer()),file.type||'image/jpeg',{...project,source_image_url:project.source_image_url||''},products)}catch(e:any){return NextResponse.json({error:e.message},{status:500})}
 const imagePath=`${user.id}/${project.id}/${crypto.randomUUID()}.png`; const {error:uErr}=await admin.storage.from('generated-designs').upload(imagePath,output,{contentType:'image/png',upsert:false}); if(uErr)return NextResponse.json({error:uErr.message},{status:500});
 const {data:signed}=await admin.storage.from('generated-designs').createSignedUrl(imagePath,60*60*24*7); const {data:design,error:dErr}=await s.from('designs').insert({project_id:project.id,user_id:user.id,generated_image_path:imagePath,generated_image_url:signed?.signedUrl,estimated_total:total,prompt:designPrompt({...project,source_image_url:''},products)}).select().single(); if(dErr)return NextResponse.json({error:dErr.message},{status:500});
 if(products.length)await admin.from('design_products').insert(products.map(x=>({design_id:design.id,category:x.category,title:x.title,store:x.store,price:x.price,image_url:x.image_url,product_url:x.product_url,affiliate_url:x.affiliate_url,description:x.description,in_stock:x.in_stock})));

 let nextSubscription=subscriptionCredits; let nextPurchased=purchasedCredits;
 if(cost>0){
   let remaining=cost;
   const fromSubscription=Math.min(nextSubscription,remaining); nextSubscription-=fromSubscription; remaining-=fromSubscription;
   if(remaining>0)nextPurchased-=remaining;
 }
 await admin.from('profiles').update({subscription_credits:nextSubscription,purchased_credits:nextPurchased,generation_count:(profile?.generation_count||0)+1}).eq('id',user.id);
 if(cost>0)await admin.from('credit_transactions').insert({user_id:user.id,amount:-cost,kind:'generation',design_id:design.id,note:mode});
 return NextResponse.json({...design,products,credits_used:cost,credits_remaining:nextSubscription+nextPurchased,basic_included:mode==='standard_design'&&plan!=='free'});
}
