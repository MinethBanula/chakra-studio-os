const PROJECT_URL=process.env.NEXT_PUBLIC_SUPABASE_URL
const PUBLISHABLE=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const SYNC_SECRET=process.env.CHAKRA_CALENDAR_SYNC_SECRET||'chakra_sync_2026_09_01_a9f4c7e2'
export async function POST(){
  try{
    if(!PROJECT_URL)throw new Error('Supabase URL missing')
    const r=await fetch(`${PROJECT_URL}/functions/v1/chakra-calendar-sync`,{method:'POST',headers:{'Content-Type':'application/json','apikey':PUBLISHABLE||'','Authorization':PUBLISHABLE?`Bearer ${PUBLISHABLE}`:'','x-chakra-sync-secret':SYNC_SECRET,'x-sync-secret':SYNC_SECRET},body:'{}',cache:'no-store'})
    const text=await r.text();let body;try{body=JSON.parse(text)}catch{body={message:text}}
    return Response.json({ok:r.ok,status:r.status,...body},{status:r.ok?200:r.status})
  }catch(e){return Response.json({ok:false,error:e.message},{status:500})}
}
