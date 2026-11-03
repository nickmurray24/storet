import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type SupportFields = { topic: string; name: string; email: string; reference: string; subject: string; message: string };
const topics: Record<string, string> = { renting:"Renting a space",hosting:"Hosting a space",payments:"Payments & receipts",account:"Account & notifications",technical:"Technical help",other:"Something else" };
const emailPattern=/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const escapeHtml=(text:string)=>text.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
const unavailable="We couldn’t confirm your request was sent. Your message is still here; please try again later.";

export function validateInput(input: unknown) {
  if(!input || typeof input!=="object" || Array.isArray(input))return null;
  const value=input as Record<string,unknown>;
  if(typeof value.request_id!=="string" || !uuidPattern.test(value.request_id) || typeof value.visit_id!=="string" || !uuidPattern.test(value.visit_id))return null;
  if(typeof value.website!=="undefined" && (typeof value.website!=="string" || value.website.trim()))return null;
  const fields:SupportFields={topic:"",name:"",email:"",reference:"",subject:"",message:""};
  for(const key of Object.keys(fields) as (keyof SupportFields)[]){
    if(typeof value[key]!=="string")return null;
    fields[key]=String(value[key]).trim();
    if(fields[key].includes("\u0000"))return null;
  }
  if(!Object.hasOwn(topics,fields.topic) || !emailPattern.test(fields.email) || fields.email.length>254
    || fields.name.length>100 || fields.reference.length>200 || !fields.subject || fields.subject.length>120
    || /[\r\n]/.test(fields.subject) || !fields.message || fields.message.length>4000)return null;
  fields.email=fields.email.toLowerCase();
  return {id:value.request_id,visitId:value.visit_id,fields};
}

async function readJson(req:Request) {
  const reader=req.body?.getReader();if(!reader)throw new Error("Invalid body");
  const parts:Uint8Array[]=[];let bytes=0;
  while(true){const result=await reader.read();if(result.done)break;bytes+=result.value.byteLength;
    if(bytes>24000){await reader.cancel();throw new Error("Body too large");}parts.push(result.value);}
  const all=new Uint8Array(bytes);let offset=0;for(const part of parts){all.set(part,offset);offset+=part.length;}
  return JSON.parse(new TextDecoder().decode(all));
}

async function privateHash(value:string,secret:string) {
  const encoder=new TextEncoder();
  const key=await crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const bytes=new Uint8Array(await crypto.subtle.sign("HMAC",key,encoder.encode(value)));
  return Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
}

export function supportEmail(fields:SupportFields,reference:string,to:string,from:string) {
  const text=[`Support request ${reference}`,`Topic: ${topics[fields.topic]}`,`Name: ${fields.name||"Not provided"}`,
    `Contact email (provided by requester): ${fields.email}`,`Listing or booking reference: ${fields.reference||"Not provided"}`,"",fields.message].join("\n");
  return {from,to:[to],reply_to:fields.email,subject:`[${reference}] ${fields.subject}`,text,
    html:`<div style="font-family:Arial,sans-serif;max-width:640px;color:#0f172a;line-height:1.7"><h1 style="font-size:24px;color:#2563eb">New Storet support request</h1><p style="white-space:pre-wrap">${escapeHtml(text)}</p></div>`};
}

export async function handleRequest(req:Request) {
  const env=(key:string)=>Deno.env.get(key)||"";
  const allowed=(env("SUPPORT_ALLOWED_ORIGINS")||env("STORET_APP_URL")||"http://localhost:3000").split(",").map(value=>{
    try{return new URL(value.trim()).origin;}catch{return "";}
  }).filter(Boolean);
  const origin=req.headers.get("origin");
  const headers:Record<string,string>={"Content-Type":"application/json","Vary":"Origin","Access-Control-Allow-Methods":"POST, OPTIONS",
    "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version"};
  if(origin && allowed.includes(origin))headers["Access-Control-Allow-Origin"]=origin;
  const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(origin && !allowed.includes(origin))return respond({error:"This site is not allowed to submit support requests."},403);
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
  if(req.method!=="POST")return respond({error:"Method not allowed"},405);
  if(!req.headers.get("content-type")?.toLowerCase().startsWith("application/json"))return respond({error:"Send a JSON request."},415);
  const apiKey=env("SUPPORT_RESEND_API_KEY"),url=env("SUPABASE_URL"),serviceKey=env("SUPABASE_SERVICE_ROLE_KEY");
  const to=env("SUPPORT_TO_EMAIL")||"storet.support@gmail.com";
  const from=env("SUPPORT_EMAIL_FROM")||"Storet Support <onboarding@resend.dev>";
  if(!apiKey || !url || !serviceKey || !emailPattern.test(to) || /[\r\n]/.test(from))return respond({error:"Support is temporarily unavailable. Please try again later.",code:"NOT_CONFIGURED"},503);
  let input;try{input=validateInput(await readJson(req));}catch{return respond({error:"Please check your request and try again."},400);}
  if(!input)return respond({error:"Please check your email, subject, and message, then try again."},400);
  const db=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const rpc=async(name:string,args:Record<string,unknown>)=>{const result=await db.rpc(name,args);if(result.error)throw new Error("Support database operation failed");return result.data;};
  try{
    const ip=(req.headers.get("x-forwarded-for")||req.headers.get("x-real-ip")||"unknown").split(",")[0].trim().slice(0,200);
    const [ipHash,emailHash]=await Promise.all([privateHash(`support-ip:${ip}`,serviceKey),privateHash(`support-email:${input.fields.email}`,serviceKey)]);
    const claim=await rpc("storet_claim_support_request",{p_request_id:input.id,p_visit_id:input.visitId,p_payload:input.fields,p_ip_hash:ipHash,p_email_hash:emailHash});
    if(claim.state==="visit_limit")return respond({error:"You’ve reached the limit of 3 support requests for this visit.",code:"VISIT_LIMIT"},429);
    if(claim.state==="rate_limit")return respond({error:"Too many support requests have been submitted. Please wait up to an hour before trying again.",code:"RATE_LIMIT"},429);
    if(claim.state==="conflict")return respond({error:"This request changed. Edit your message and try again.",code:"CONFLICT"},409);
    if(claim.state==="in_progress")return respond({error:"Your request is still being processed. Please wait two minutes before retrying.",code:"IN_PROGRESS"},409);
    if(claim.state==="review_required")return respond({error:"This request needs a delivery check. Please keep its reference and contact support directly.",code:"REVIEW_REQUIRED",reference:claim.reference},409);
    if(claim.state==="sent")return respond({ok:true,reference:claim.reference,visitCount:claim.visit_count});
    if(claim.state!=="claimed" || !claim.request)throw new Error("Invalid support claim");
    const job=claim.request,reference=`ST-${job.ticket_number}`;
    const lease={p_request_id:input.id,p_claim_token:job.claim_token};
    const payload=await rpc("storet_prepare_support_email",{...lease,p_payload:supportEmail(input.fields,reference,to,from)});
    if(!payload)return respond({error:"Your request is still being processed. Please wait before retrying.",code:"IN_PROGRESS"},409);
    let response:Response;
    try{
      response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json","Idempotency-Key":`storet-support-${input.id}`},body:JSON.stringify(payload),signal:AbortSignal.timeout(10000)});
    }catch{
      await rpc("storet_finish_support_email",{...lease,p_outcome:"failed",p_error:"Email provider request failed or timed out"});
      return respond({error:unavailable,reference},502);
    }
    const result=await response.json().catch(()=>({}));
    if(!response.ok || typeof result.id!=="string"){
      await rpc("storet_finish_support_email",{...lease,p_outcome:"failed",p_error:`Email provider returned HTTP ${response.status}`});
      return respond({error:unavailable,reference},502);
    }
    const finished=await rpc("storet_finish_support_email",{...lease,p_outcome:"sent",p_provider_id:result.id});
    if(!finished)throw new Error("Support lease changed");
    return respond({ok:true,reference,visitCount:claim.visit_count});
  }catch{
    console.error("Support request delivery could not be confirmed");
    return respond({error:unavailable},503);
  }
}
Deno.serve(handleRequest);
