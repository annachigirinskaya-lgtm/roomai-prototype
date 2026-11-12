const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
function load(path,deps={}){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:module.exports,module,Buffer,process:{env:{OPENAI_API_KEY:'test-only'}},require:name=>name in deps?deps[name]:require(name)});return module.exports}
const composition=load('lib/design-composition.ts');const catalog=load('lib/catalog.ts');const layouts=load('lib/layouts.ts');
const calls=[];class MockOpenAI{images={edit:async request=>{calls.push(request);return {data:[{b64_json:Buffer.from('test-image').toString('base64')}]}}}}
const service=load('services/ai-image.ts',{'openai':{default:MockOpenAI,toFile:async(source,name,options)=>({source,name,...options})},'@/lib/catalog':catalog,'@/lib/design-composition':composition,'@/lib/layouts':layouts,'./masked-edit':{preserveOutsideMask:()=>{throw Error('Generation must not use a patch mask')}}});
const project={name:'Room',room_type:'Bedroom',style:'Luxury',color_palette:'Lilac',custom_colors:'cream and lavender',budget:800,budget_mode:'balanced',keep_items:'existing desk',replace_items:'bedding',notes:'',source_image_url:'',layout_mode:'preserve'};
(async()=>{
 const image=Buffer.alloc(24);image.writeUInt32BE(1024,16);image.writeUInt32BE(768,20);
 await service.generateFromRoom(image,'image/png',project,[],[{source:image,mime:'image/png'}]);
 await service.generateFromRoom(image,'image/png',{...project,style:'Modern'},[]);
 await service.generateFromRoom(image,'image/png',{...project,room_type:'Kitchen'},[]);
 assert.equal(calls[0].image.length,2,'all input views reach the image edit');
 assert.match(calls[0].prompt,/Make the bed the couture focal point/);
 assert.match(calls[1].prompt,/Make the bed wall a crisp contemporary composition/);
 assert.doesNotMatch(calls[2].prompt,/Make the bed the couture focal point/,'a kitchen must not get bedroom styling');
 for(const call of calls){assert.match(call.prompt,/Wood is a secondary accent|Wood may appear in selected pieces/);assert.match(call.prompt,/five visible design layers/);assert.match(call.prompt,/existing \$800 total/);assert.match(call.prompt,/existing desk/);assert.match(call.prompt,/cream and lavender/);assert.match(call.prompt,/Never ADD a new door/);assert.doesNotMatch(call.prompt,/Book-matched marble is mandatory/);assert.match(call.prompt,/KEEP THE ORIGINAL FURNITURE ARRANGEMENT/)}
 console.log('PASS: image-edit requests keep references, palette, kept items and budget; bedroom-specific Luxury and Modern differ; kitchen avoids bed requirements; new openings prohibited and mandatory marble conflict removed');
})().catch(error=>{console.error(error);process.exitCode=1});
