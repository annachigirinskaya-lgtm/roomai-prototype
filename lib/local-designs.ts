export type LocalDesign={id:string;style:string;createdAt:number;project:Record<string,unknown>;image:Blob;parentId?:string;editInstruction?:string};
const DB='roomai-local';
const STORE='designs';

function openDb(){return new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open(DB,1);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE,{keyPath:'id'})};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
export async function saveLocalDesign(record:LocalDesign){const db=await openDb();return await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(record);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)})}
export async function getLocalDesign(id:string){const db=await openDb();return await new Promise<LocalDesign|undefined>((resolve,reject)=>{const request=db.transaction(STORE).objectStore(STORE).get(id);request.onsuccess=()=>{db.close();resolve(request.result as LocalDesign|undefined)};request.onerror=()=>reject(request.error)})}
