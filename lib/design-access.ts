import { createClient } from '@/lib/supabase/server';

/** Prototype editing works without Supabase. Account mode requires a paid plan. */
export async function editorAccess():Promise<{allowed:true;userId?:string}|{allowed:false;error:string;status:number}>{
  if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)return {allowed:true};
  const client=await createClient();
  const {data:{user},error:authError}=await client.auth.getUser();
  if(authError||!user)return {allowed:false,error:'Sign in to edit designs.',status:401};
  const {data:profile,error}=await client.from('profiles').select('plan').eq('id',user.id).single();
  if(error||!profile)return {allowed:false,error:'Your plan could not be verified. Please try again.',status:503};
  if(profile.plan==='free')return {allowed:false,error:'Detail editing is included with a paid plan. Visit Plans to subscribe.',status:403};
  return {allowed:true,userId:user.id};
}
