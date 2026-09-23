'use client';
import { useState } from 'react';

export default function ManageBilling(){
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function openPortal(){
    setBusy(true);setError('');
    try{
      const response=await fetch('/api/stripe/portal',{method:'POST'});
      const data=await response.json();
      if(!response.ok||!data.url)throw new Error(data.error||'Could not open billing management.');
      window.location.assign(data.url);
    }catch(reason){setError(reason instanceof Error?reason.message:'Could not open billing management.');setBusy(false)}
  }
  return <div><button type="button" onClick={openPortal} disabled={busy} className="btn-soft disabled:opacity-50">{busy?'Opening billing…':'Manage billing'}</button>{error&&<p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}</div>;
}
