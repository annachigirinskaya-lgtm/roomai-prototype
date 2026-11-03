'use client';

import { useRef, useState } from 'react';

type ComparisonResult={id:string;style:string;generated_image_url:string};
type Props={
  pinned?:ComparisonResult;
  alternative?:ComparisonResult;
  index:number;
  total:number;
  busy:boolean;
  onPrevious:()=>void;
  onNext:()=>void;
  onPin:(result:ComparisonResult)=>void;
  onChoose:(result:ComparisonResult)=>void;
};

export default function DesignComparison({pinned,alternative,index,total,busy,onPrevious,onNext,onPin,onChoose}:Props){
  const swipeStart=useRef<number|null>(null);
  const [portrait,setPortrait]=useState(false);
  return <>
    <div className={`comparison-stage${portrait?' comparison-portrait':''}`}>
      {pinned&&<div className="comparison-photo comparison-reference">
        <img src={pinned.generated_image_url} alt={`Pinned ${pinned.style} room design`} onLoad={event=>{const image=event.currentTarget;setPortrait(image.naturalHeight>image.naturalWidth)}}/>
      </div>}
      <div className="comparison-navigation">
        <button type="button" disabled={!total||busy} aria-label="Previous design" onClick={onPrevious}>←</button>
        <div className="comparison-caption" aria-live="polite">
          <div><strong>{pinned?.style}</strong><span> vs </span><strong>{alternative?.style||'No alternative yet'}</strong></div>
          <small>Pinned · {total?`${index+1} / ${total}`:'Waiting for another design'}</small>
        </div>
        <button type="button" disabled={!total||busy} aria-label="Next design" onClick={onNext}>→</button>
      </div>
      {alternative&&<button type="button" className="comparison-photo comparison-alternative" aria-label={`Pin ${alternative.style} for comparison`} disabled={busy} onClick={()=>onPin(alternative)}
        onTouchStart={event=>{swipeStart.current=event.touches[0].clientX}}
        onTouchEnd={event=>{
          const start=swipeStart.current;swipeStart.current=null;
          if(start===null||!total)return;
          const delta=event.changedTouches[0].clientX-start;
          if(Math.abs(delta)>40){event.preventDefault();if(delta<0)onNext();else onPrevious()}
        }}
        onTouchCancel={()=>{swipeStart.current=null}}>
        <img src={alternative.generated_image_url} alt={`${alternative.style} room design for comparison`}/>
      </button>}
    </div>
    <div className="comparison-choices">
      <button type="button" disabled={!pinned||busy} onClick={()=>pinned&&onChoose(pinned)}>Choose {pinned?.style}</button>
      <button type="button" disabled={!alternative||busy} onClick={()=>alternative&&onChoose(alternative)}>Choose {alternative?.style||'alternative'}</button>
    </div>
  </>;
}
