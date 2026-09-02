export async function GET(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if(!url||!key)return Response.json({ok:false,error:'missing supabase env'},{status:500})
  try{
    const r=await fetch(`${url}/rest/v1/`,{headers:{apikey:key,Authorization:`Bearer ${key}`,Accept:'application/openapi+json'},cache:'no-store'})
    const raw=await r.text()
    if(!r.ok)return Response.json({ok:false,status:r.status,body:raw.slice(0,2000)},{status:500})
    const schema=JSON.parse(raw)
    const wanted=['chakra_projects','chakra_clients','chakra_tasks','chakra_meetings','chakra_members','chakra_project_members','chakra_project_milestones','chakra_milestones','chakra_finance_entries','chakra_subscriptions','chakra_invoices','chakra_payments','chakra_company_settings','chakra_analysis_reports','chakra_business_targets','chakra_integration_settings']
    const defs=schema.definitions||schema.components?.schemas||{}
    const out={}
    for(const name of wanted){
      const d=defs[name]
      if(d?.properties)out[name]={columns:Object.keys(d.properties),required:d.required||[]}
      else out[name]={columns:[],missing:true}
    }
    return Response.json({ok:true,tables:out})
  }catch(e){return Response.json({ok:false,error:e.message},{status:500})}
}
