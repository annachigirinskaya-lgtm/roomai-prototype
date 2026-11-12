const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const vm=require('node:vm');
function load(path,globals={}){
 const output={};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:output,Response,Blob,URL,...globals});
 return output;
}
const {readShoppingResponse}=load('lib/shopping-response.ts');
(async()=>{
 await assert.rejects(()=>readShoppingResponse(new Response('FUNCTION_PAYLOAD_TOO_LARGE',{status:413})),/photo was too large/);
 await assert.rejects(()=>readShoppingResponse(new Response('<html>Sign in</html>',{status:403})),/invitation link/);
 await assert.rejects(()=>readShoppingResponse(new Response('<html>Bad gateway</html>',{status:502})),/unreadable response/);
 await assert.rejects(()=>readShoppingResponse(new Response('',{status:200})),/unreadable response/);
 await assert.rejects(()=>readShoppingResponse(new Response('timed out',{status:504})),/took too long/);
 await assert.rejects(()=>readShoppingResponse(Response.json({error:'Search limit reached'},{status:429})),/Search limit reached/);
 await assert.rejects(()=>readShoppingResponse(Response.json({items:[null],checkedAt:new Date().toISOString()})),/incomplete item/);
 const list={items:[{id:'tv',category:'tv',description:'A television',title:'Example',quantity:1,x:30,y:40,price:null,included:true,priceQuote:'',productUrl:null,store:null}],checkedAt:new Date().toISOString()};
 assert.equal((await readShoppingResponse(Response.json(list))).items[0].price,null);
 // Real saved designs may be large PNGs. Check that only the upload copy changes.
 let cleaned=0;let dimensions;const source=new Blob([new Uint8Array(6*1024*1024)],{type:'image/png'});
 const canvas={width:0,height:0,getContext:()=>({fillRect(){},drawImage(){dimensions=[canvas.width,canvas.height]}}),toBlob:cb=>cb(new Blob([new Uint8Array(200000)],{type:'image/jpeg'}))};
 class ImageFixture{naturalWidth=4096;naturalHeight=2048;set src(value){queueMicrotask(()=>this.onload())}}
 const {prepareVisionUpload,MAX_VISION_UPLOAD_BYTES}=load('lib/vision-upload.ts',{Image:ImageFixture,document:{createElement:()=>canvas},URL:{createObjectURL:()=> 'blob:test',revokeObjectURL:()=>cleaned++}});
 const uploaded=await prepareVisionUpload(source);
 assert.ok(uploaded.size<MAX_VISION_UPLOAD_BYTES);assert.equal(uploaded.type,'image/jpeg');assert.equal(source.size,6*1024*1024);assert.deepEqual(dimensions,[1280,640]);assert.equal(cleaned,1);
 await assert.rejects(()=>prepareVisionUpload(new Blob([])),/could not be read/);
 console.log('PASS: non-JSON hosting errors, Safari JSON failure regression, access and timeout errors, valid unpriced products, large-image upload copy and original preservation');
})().catch(error=>{console.error(error);process.exitCode=1});
