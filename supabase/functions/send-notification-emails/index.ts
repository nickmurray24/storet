import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type EmailJob = { id: string; claim_token: string; title: string; description: string; action_to?: string; action_label?: string };
type EmailPayload = { from: string; to: string[]; subject: string; html: string; text: string };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
export const escapeHtml = (value: string) => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
export function appLink(appUrl: string, path: string = "/notifications") {
  // Links originate from notification records, but must stay inside this app.
  const safe = /^\/(?!\/)/.test(path) && !/[\\\u0000-\u0020]/.test(path) ? path : "/notifications";
  const base = new URL(appUrl.endsWith("/") ? appUrl : appUrl + "/");
  const result = new URL(safe.slice(1), base);
  return result.origin === base.origin ? result.href : new URL("notifications", base).href;
}
export function emailPayload(job: EmailJob, email: string, from: string, appUrl: string): EmailPayload {
  const title = String(job.title || "Storet update").replace(/[\r\n]/g," ").slice(0,180);
  const description = String(job.description || "").slice(0,4000);
  const link = appLink(appUrl, job.action_to || "/notifications");
  const settings = appLink(appUrl, "/settings");
  const label = String(job.action_label || "View notification").slice(0,100);
  return { from, to: [email], subject: `Storet: ${title}`,
    text: `${title}\n\n${description}\n\n${label}: ${link}\n\nManage notification preferences: ${settings}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:24px auto;color:#0f172a;line-height:1.6"><p style="font-weight:bold;color:#2563eb">Storet</p><h1 style="font-size:24px">${escapeHtml(title)}</h1><p style="white-space:pre-line">${escapeHtml(description)}</p><p><a style="display:inline-block;background:#2563eb;color:white;padding:10px 18px;border-radius:8px;text-decoration:none" href="${escapeHtml(link)}">${escapeHtml(label)}</a></p><hr style="border:0;border-top:1px solid #e2e8f0;margin-top:28px"><p style="font-size:12px;color:#64748b">You received this email because of activity on Storet. <a href="${escapeHtml(settings)}">Manage notification preferences</a>.</p></div>` };
}
async function secretsMatch(actual: string, expected: string) {
  const encoder = new TextEncoder();
  const [a,b] = await Promise.all([actual,expected].map(s => crypto.subtle.digest("SHA-256",encoder.encode(s))));
  const aa=new Uint8Array(a),bb=new Uint8Array(b);let diff=0;
  for(let i=0;i<aa.length;i++)diff |= aa[i]^bb[i];
  return diff===0;
}

export async function handleRequest(req: Request) {
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  const env = (key: string) => Deno.env.get(key) || "";
  const secret=env("NOTIFICATION_WORKER_SECRET");
  if(secret.length<32)return json({error:"Email worker is not configured"},503);
  if(!(await secretsMatch(req.headers.get("x-storet-email-secret") || "",secret)))return json({error:"Unauthorized"},401);
  const apiKey=env("RESEND_API_KEY"),from=env("NOTIFICATION_EMAIL_FROM"),appUrl=env("STORET_APP_URL");
  const supabaseUrl=env("SUPABASE_URL"),serviceKey=env("SUPABASE_SERVICE_ROLE_KEY");
  try {
    const url=new URL(appUrl);
    if((url.protocol!=="https:" && !(url.protocol==="http:" && ["localhost","127.0.0.1"].includes(url.hostname))) || url.username || url.password || url.search || url.hash)throw Error();
    if(!apiKey || !from || /[\r\n]/.test(from) || !supabaseUrl || !serviceKey)throw Error();
  }catch {return json({error:"Email worker is not configured"},503);}
  const db=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const rpc=async(name:string,args:Record<string,unknown>)=>{
    const result=await db.rpc(name,args);if(result.error)throw new Error("Email queue operation failed");return result.data;
  };
  let sent=0,skipped=0,retried=0,failed=0;
  try {
    // Request bodies cannot supply recipients, templates, or a batch size.
    const jobs:EmailJob[]=await rpc("storet_claim_notification_emails",{p_limit:10}) || [];
    let providerAttempted=false;
    for(const job of jobs){
      const finish=async(outcome:string,reason:string|null=null,providerId:string|null=null)=>{
        const updated=await rpc("storet_finish_notification_email",{p_job_id:job.id,p_claim_token:job.claim_token,p_outcome:outcome,p_provider_id:providerId,p_error:reason});
        if(!updated)throw new Error("Email queue lease changed");
      };
      const contextArgs={p_job_id:job.id,p_claim_token:job.claim_token};
      let contexts=await rpc("storet_get_notification_email_context",contextArgs);
      let context=contexts?.[0];
      if(!context)continue;
      if(!context.email_enabled || !context.email_verified || !context.email){await finish("skipped","Email disabled or account email is unverified/unavailable");skipped++;continue;}
      const payload:EmailPayload|null=await rpc("storet_prepare_notification_email",{...contextArgs,p_payload:emailPayload(job,context.email,from,appUrl)});
      if(!payload)continue;
      if(providerAttempted)await new Promise(resolve=>setTimeout(resolve,550));
      // Recheck after waiting; opt-outs and account email changes also stop queued messages.
      contexts=await rpc("storet_get_notification_email_context",contextArgs);context=contexts?.[0];
      if(!context)continue;
      if(!context.email_enabled || !context.email_verified || payload.to.length!==1 || payload.to[0]!==context.email){await finish("skipped","Email preference or recipient changed");skipped++;continue;}
      providerAttempted=true;
      let response:Response;
      try {
        response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json","Idempotency-Key":`storet-notification-${job.id}`},body:JSON.stringify(payload),signal:AbortSignal.timeout(8000)});
      }catch {await finish("retry","Email provider request timed out or failed");retried++;continue;}
      const result=await response.json().catch(()=>({}));
      if(response.ok && typeof result.id==="string"){await finish("sent",null,result.id);sent++;}
      else {
        // Do not store/log provider bodies: they can contain addresses or credentials.
        const permanent=[400,404,413,422].includes(response.status);
        await finish(permanent?"failed":"retry",`Email provider returned HTTP ${response.status}`);
        if(permanent)failed++;else retried++;
      }
    }
    return json({sent,skipped,retried,failed});
  } catch {
    // Unacknowledged jobs become eligible after their lease; the frozen payload and key prevent duplicate sends.
    console.error("Notification email worker could not finish its queue batch");
    return json({error:"Email queue processing failed"},500);
  }
}
Deno.serve(handleRequest);
