import OpenAI from 'openai';

export async function verifyLayoutChange(before:Buffer,mime:string,after:Buffer,instruction:string){
  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY,timeout:30000,maxRetries:0});
  const result=await client.responses.create({
    model:process.env.OPENAI_VISION_MODEL||'gpt-4.1-mini',max_output_tokens:350,
    text:{format:{type:'json_object'}},
    input:[{role:'user',content:[
      {type:'input_text',text:`You are validating a furniture relocation, not rating its style. First image BEFORE, second AFTER. Requested change: ${instruction}. Check the full-sized furniture positions, not cushions/plants. Return JSON {"changed":boolean,"architecturePreserved":boolean}. changed=true ONLY if the requested furniture is clearly in its new zone(s); a recolor, changed decor, duplicated item or unchanged placement is false. architecturePreserved=true only if visible doors/windows/walls retain their location and are usable. If uncertain return false. Never claim a move based only on lighting changes.`},
      {type:'input_image',image_url:`data:${mime};base64,${before.toString('base64')}`,detail:'high'},
      {type:'input_image',image_url:`data:image/png;base64,${after.toString('base64')}`,detail:'high'},
    ]}],
  });
  const check=JSON.parse(result.output_text);
  if(check.changed!==true||check.architecturePreserved!==true)throw new Error('The requested furniture move was not confirmed. No new version was saved. Choose a clearer destination or try another layout.');
}
