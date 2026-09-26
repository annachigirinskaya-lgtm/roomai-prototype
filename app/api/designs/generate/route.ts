import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildShoppingList } from '@/services/product-matcher';
import { designPrompt, generateFromRoom, IMAGE_MODEL, IMAGE_QUALITY, IMAGE_SIZE } from '@/services/ai-image';
import { CREDIT_COSTS, STYLES } from '@/lib/catalog';

export const maxDuration=300;
type GenerateBody={projectId:string;mode?:keyof typeof CREDIT_COSTS;styles?:string[]};

export async function POST(req:NextRequest){
  const s=await createClient();
  const {data:{user}}=await s.auth.getUser();
  if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
  const {projectId,mode='shoppable_design',styles=[]}=await req.json() as GenerateBody;
  const {data:project,error:pErr}=await s.from('projects').select('*').eq('id',projectId).eq('user_id',user.id).single();
  if(pErr||!project)return NextResponse.json({error:'Project not found'},{status:404});
  const requested=[...new Set(styles)].filter(x=>STYLES.includes(x as never)).slice(0,6);
  const isComparison=requested.length>0;
  if(isComparison&&requested.length<1)return NextResponse.json({error:'Choose at least one style.'},{status:400});
  const admin=createAdminClient();
  const {data:profile}=await admin.from('profiles').select('*').eq('id',user.id).single();
  const plan=profile?.plan||'free';
  const unitCost=isComparison?CREDIT_COSTS.standard_design:(mode==='standard_design'&&plan!=='free'?0:(CREDIT_COSTS[mode]??CREDIT_COSTS.shoppable_design));
  const estimatedCost=isComparison&&plan!=='free'?0:unitCost*(isComparison?requested.length:1);
  const subscriptionCredits=profile?.subscription_credits||0;
  const purchasedCredits=profile?.purchased_credits||0;
  if(subscriptionCredits+purchasedCredits<estimatedCost)return NextResponse.json({error:`This comparison needs ${estimatedCost} credits.`,credits_needed:estimatedCost,credits_available:subscriptionCredits+purchasedCredits},{status:402});
  const {data:file,error:fErr}=await admin.storage.from('room-images').download(project.source_image_path);
  if(fErr||!file)return NextResponse.json({error:'Could not read source image'},{status:500});
  const source=Buffer.from(await file.arrayBuffer());
  const mime=file.type||'image/jpeg';
  const stylesToGenerate=isComparison?requested:[project.style];
  const products=isComparison||mode==='standard_design'?[]:await buildShoppingList({...project,source_image_url:project.source_image_url||''});
  const total=products.reduce((n,x)=>n+x.price,0);
  const completed:any[]=[];
  for(let i=0;i<stylesToGenerate.length;i+=2){
    const batch=stylesToGenerate.slice(i,i+2);
    const results=await Promise.allSettled(batch.map(async style=>{
      const styledProject={...project,style,source_image_url:project.source_image_url||''};
      const output=await generateFromRoom(source,mime,styledProject,products,stylesToGenerate);
      const imagePath=`${user.id}/${project.id}/${crypto.randomUUID()}.png`;
      const {error:uErr}=await admin.storage.from('generated-designs').upload(imagePath,output,{contentType:'image/png',upsert:false});
      if(uErr)throw uErr;
      const {data:signed}=await admin.storage.from('generated-designs').createSignedUrl(imagePath,60*60*24*7);
      const {data:design,error:dErr}=await s.from('designs').insert({project_id:project.id,user_id:user.id,generated_image_path:imagePath,generated_image_url:signed?.signedUrl,estimated_total:total,prompt:designPrompt(styledProject,products,stylesToGenerate)}).select().single();
      if(dErr)throw dErr;
      if(products.length)await admin.from('design_products').insert(products.map(x=>({design_id:design.id,category:x.category,title:x.title,store:x.store,price:x.price,image_url:x.image_url,product_url:x.product_url,affiliate_url:x.affiliate_url,description:x.description,in_stock:x.in_stock})));
      return {...design,style,generated_image_url:signed?.signedUrl};
    }));
    results.forEach((result,index)=>{if(result.status==='fulfilled')completed.push(result.value);else console.error(`Image generation failed for ${batch[index]}`,result.reason)});
  }
  if(!completed.length)return NextResponse.json({error:'Image generation did not return a result. Please try again.'},{status:502});
  const charged=isComparison&&plan!=='free'?0:unitCost*completed.length;
  let nextSubscription=subscriptionCredits;let nextPurchased=purchasedCredits;let remaining=charged;
  const fromSubscription=Math.min(nextSubscription,remaining);nextSubscription-=fromSubscription;remaining-=fromSubscription;if(remaining>0)nextPurchased-=remaining;
  await admin.from('profiles').update({subscription_credits:nextSubscription,purchased_credits:nextPurchased,generation_count:(profile?.generation_count||0)+completed.length}).eq('id',user.id);
  if(charged>0)await admin.from('credit_transactions').insert({user_id:user.id,amount:-charged,kind:'generation',design_id:completed[0].id,note:isComparison?`style_compare_${completed.length}`:mode});
  return NextResponse.json({designs:completed,products,credits_used:charged,credits_remaining:nextSubscription+nextPurchased,model:IMAGE_MODEL,size:IMAGE_SIZE,quality:IMAGE_QUALITY,partial:completed.length!==stylesToGenerate.length});
}
