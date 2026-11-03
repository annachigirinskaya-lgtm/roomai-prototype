import type { ShoppingList } from '@/lib/shopping';

/** Hosting errors and sign-in redirects can be text/HTML, including on Safari. */
export async function readShoppingResponse(response:Response):Promise<ShoppingList>{
  if(response.status===413)throw new Error('The photo was too large to send. Refresh the page to load the photo upload fix, then try again.');
  if(response.status===504||response.status===408)throw new Error('Product search took too long. Please try searching one item in the room first.');
  const text=await response.text();
  let data:unknown;
  try{data=JSON.parse(text)}catch{
    if(response.status===401||response.status===403||response.redirected)throw new Error('Access to product search expired. Reopen your invitation link in Safari, then try again.');
    throw new Error('Product search returned an unreadable response. Please try again shortly.');
  }
  if(!response.ok){
    const error=data&&typeof data==='object'&&'error' in data?data.error:null;
    throw new Error(typeof error==='string'?error:'Could not check retailer prices right now. Please try again.');
  }
  if(!data||typeof data!=='object'||!('items' in data)||!Array.isArray(data.items)||!data.items.length||!('checkedAt' in data)||typeof data.checkedAt!=='string'||!Number.isFinite(Date.parse(data.checkedAt))){
    throw new Error('Product search did not return a complete result. Please try again.');
  }
  for(const item of data.items){
    if(!item||typeof item!=='object'||typeof item.id!=='string'||typeof item.category!=='string'||typeof item.description!=='string'||typeof item.title!=='string'||typeof item.included!=='boolean'||!Number.isInteger(item.quantity)||item.quantity<1||!Number.isFinite(item.x)||!Number.isFinite(item.y)||(item.price!==null&&(!Number.isFinite(item.price)||item.price<=0))){
      throw new Error('Product search returned an incomplete item. Please try again.');
    }
  }
  return data as ShoppingList;
}
