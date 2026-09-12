import { Product } from '@/lib/types';
import { randomUUID } from 'crypto';
const stores=['Amazon','Walmart','Temu','IKEA'] as const;
export async function searchProducts(category:string,style:string,palette:string,target:number):Promise<Product[]>{
 return stores.map((store,i)=>{const p=Math.max(12,Math.round(target*(0.68+i*0.11)));const q=encodeURIComponent(`${style} ${palette} ${category}`);return {id:randomUUID(),title:`${style} ${category}`,store,price:p,image_url:`https://picsum.photos/seed/${encodeURIComponent(store+category+style)}/500/400`,product_url:`https://www.google.com/search?q=${q}`,affiliate_url:affiliate(store,q),category,description:`${palette} ${category} selected for a ${style} room`,in_stock:true}})
}
function affiliate(store:string,q:string){switch(store){case'Amazon':return `https://www.amazon.com/s?k=${q}${process.env.AMAZON_ASSOCIATE_TAG?`&tag=${process.env.AMAZON_ASSOCIATE_TAG}`:''}`;case'Walmart':return `https://www.walmart.com/search?q=${q}`;case'Temu':return `https://www.temu.com/search_result.html?search_key=${q}`;default:return `https://www.ikea.com/us/en/search/?q=${q}`}}
