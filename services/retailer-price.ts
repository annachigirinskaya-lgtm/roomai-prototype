import { retailerUrl } from '@/lib/shopping';

function amount(value:unknown):number|null{
  const price=typeof value==='number'?value:typeof value==='string'&&/^\d[\d,]*(?:\.\d{1,2})?$/.test(value)?Number(value.replace(/,/g,'')):NaN;
  return Number.isFinite(price)&&price>0&&price<1000000?price:null;
}

/** Read machine-published USD offers, never an AI-estimated or cached price. */
export function retailerPrice(html:string):number|null{
  const prices:number[]=[];
  const readOffer=(offer:unknown)=>{
    if(Array.isArray(offer)){offer.forEach(readOffer);return}
    if(!offer||typeof offer!=='object')return;
    const data=offer as Record<string,unknown>;
    if(data['@type']==='AggregateOffer'||data.validForMemberTier)return;
    if(data.priceCurrency==='USD'){
      const price=amount(data.price);if(price!==null)prices.push(price);
    }
  };
  const walk=(node:unknown)=>{
    if(!node||typeof node!=='object')return;
    if(Array.isArray(node)){node.forEach(walk);return}
    const data=node as Record<string,unknown>;
    const type=data['@type'];
    if(type==='Product'||Array.isArray(type)&&type.includes('Product'))readOffer(data.offers);
    for(const value of Object.values(data))if(value&&typeof value==='object')walk(value);
  };
  for(const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){
    if(!/\btype\s*=\s*["']application\/ld\+json["']/i.test(script[1]))continue;
    try{walk(JSON.parse(script[2]))}catch{/* Ignore non-JSON scripts; never execute retailer code. */}
  }
  const unique=[...new Set(prices)];
  if(unique.length===1)return unique[0];
  if(unique.length>1)return null; // Multiple variants/prices require a specific offer.
  const meta=new Map<string,string>();
  for(const tag of html.matchAll(/<meta\b[^>]*>/gi)){
    const name=tag[0].match(/\b(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i)?.[1];
    const content=tag[0].match(/\bcontent\s*=\s*["']([^"']+)["']/i)?.[1];
    if(name&&content)meta.set(name.toLowerCase(),content);
  }
  if((meta.get('product:price:currency')||meta.get('og:price:currency'))==='USD')return amount(meta.get('product:price:amount')||meta.get('og:price:amount'));
  return null;
}

export async function confirmRetailerPrice(productUrl:string):Promise<number|null>{
  let url=retailerUrl(productUrl);if(!url)return null;
  try{
    for(let redirects=0;redirects<3;redirects++){
      const parsed=new URL(url);if(parsed.port&&parsed.port!=='443')return null;
      const response:Response=await fetch(url,{redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(10000),headers:{Accept:'text/html','User-Agent':'Mozilla/5.0 (compatible; RoomAI/1.0; product price verification)'}});
      if(response.status>=300&&response.status<400){
        const location:string|null=response.headers.get('location');await response.body?.cancel();
        url=location?retailerUrl(new URL(location,url).href):null;if(!url)return null;continue;
      }
      if(!response.ok||!response.headers.get('content-type')?.includes('text/html')){await response.body?.cancel();return null}
      const reader=response.body?.getReader();if(!reader)return null;
      const chunks:Uint8Array[]=[];let size=0;const maxBytes=2500000;
      while(size<maxBytes){const {done,value}=await reader.read();if(done)break;const chunk=value.subarray(0,maxBytes-size);chunks.push(chunk);size+=chunk.length}
      await reader.cancel();
      return retailerPrice(Buffer.concat(chunks).toString('utf8'));
    }
  }catch{/* A blocked/unavailable retailer page is not evidence of a current price. */}
  return null;
}
