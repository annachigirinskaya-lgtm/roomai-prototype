'use client';

import { useState } from 'react';

const BETA_MODE=process.env.NEXT_PUBLIC_ROOMAI_BETA_MODE==='true';

export default function BetaFeedback({context}:{context:string}){
  const [rating,setRating]=useState(0);
  const [note,setNote]=useState('');
  const [status,setStatus]=useState('');

  if(!BETA_MODE)return null;

  async function sendFeedback(){
    const text=[
      'RoomAI private beta feedback',
      `Screen: ${context}`,
      `Rating: ${rating}/5`,
      `Comment: ${note.trim()||'No comment'}`,
    ].join('\n');
    try{
      if(navigator.share){
        await navigator.share({title:'RoomAI beta feedback',text});
        setStatus('Thank you — the share sheet was opened.');
      }else{
        await navigator.clipboard.writeText(text);
        setStatus('Feedback copied. Send it to the person who invited you.');
      }
    }catch(reason){
      if(reason instanceof DOMException&&reason.name==='AbortError')return;
      setStatus('Could not open sharing. Take a screenshot of this feedback instead.');
    }
  }

  return <section className="beta-feedback">
    <div className="kicker">Private beta</div>
    <h3>How did this result feel?</h3>
    <p>Rate the experience and tell us what looked wrong or felt confusing.</p>
    <div className="beta-rating" aria-label="Rate this experience from one to five">
      {[1,2,3,4,5].map(value=><button type="button" key={value} className={value<=rating?'selected':''} onClick={()=>setRating(value)} aria-label={`${value} out of 5`}>★</button>)}
    </div>
    <textarea value={note} onChange={event=>setNote(event.target.value)} maxLength={500} rows={3} placeholder="Example: Modern changed my window, but Luxury looked great."/>
    <button type="button" className="btn-soft w-full" disabled={!rating} onClick={sendFeedback}>Send beta feedback</button>
    {status&&<p className="beta-feedback-status" role="status">{status}</p>}
  </section>;
}
