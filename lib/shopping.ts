export type ShoppingItem={id:string;category:string;description:string;quantity:number;x:number;y:number;title:string;price:number|null;priceQuote:string;productUrl:string|null;store:string|null;included:boolean};
export type ShoppingList={items:ShoppingItem[];checkedAt:string};

export function retailerUrl(value:unknown):string|null{
  if(typeof value!=='string')return null;
  try{
    const url=new URL(value);
    const host=url.hostname.toLowerCase();
    if(url.protocol!=='https:'||url.username||url.password)return null;
    if(!['amazon.com','walmart.com','ikea.com','target.com'].some(domain=>host===domain||host.endsWith(`.${domain}`)))return null;
    if(!(/\/dp\/[A-Z0-9]{10}(?:\/|$)/i.test(url.pathname)||/\/gp\/product\/[A-Z0-9]{10}(?:\/|$)/i.test(url.pathname)||/\/ip\//.test(url.pathname)||/\/p\//.test(url.pathname)))return null;
    url.hash='';return url.href;
  }catch{return null}
}

export function normalizeShoppingItems(raw:unknown,sources:string[]):ShoppingItem[]{
  if(!Array.isArray(raw))throw new Error('The shopping list could not be read. Please try again.');
  const sourceUrls=new Set(sources.map(retailerUrl).filter(Boolean).map(url=>new URL(url!).origin+new URL(url!).pathname.replace(/\/$/,'')));
  return raw.filter(entry=>entry&&typeof entry==='object').slice(0,24).map((entry,index)=>{
    const url=retailerUrl(entry.productUrl);
    const sourced=!!url&&sourceUrls.has(new URL(url).origin+new URL(url).pathname.replace(/\/$/,''));
    const quotedPrices=typeof entry.priceQuote==='string'?[...entry.priceQuote.matchAll(/(?:USD\s*|\$\s*)(\d[\d,]*(?:\.\d{2})?)/g)].map(match=>Number(match[1].replace(/,/g,''))):[];
    const price=typeof entry.price==='number'&&Number.isFinite(entry.price)&&entry.price>0&&quotedPrices.length===1&&quotedPrices[0]===entry.price?entry.price:null;
    return {id:`item-${index}`,category:String(entry.category||'Furniture').slice(0,80),description:String(entry.description||'').slice(0,400),quantity:Number.isInteger(entry.quantity)&&entry.quantity>0?Math.min(entry.quantity,20):1,x:Number.isFinite(entry.x)?Math.max(0,Math.min(100,entry.x)):50,y:Number.isFinite(entry.y)?Math.max(0,Math.min(100,entry.y)):50,title:String(entry.title||'Similar item not found').slice(0,250),price:sourced?price:null,priceQuote:sourced&&price!==null?entry.priceQuote.slice(0,160):'',productUrl:sourced?url:null,store:sourced?new URL(url!).hostname.replace(/^www\./,''):null,included:entry.included!==false};
  });
}

export function shoppingTotal(items:ShoppingItem[]){
  const included=items.filter(item=>item.included);
  return {total:Math.round(included.reduce((sum,item)=>sum+(item.price??0)*item.quantity,0)*100)/100,missing:included.filter(item=>item.price===null).length,count:included.length};
}
