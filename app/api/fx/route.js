export async function GET(){
  try{
    const r=await fetch('https://open.er-api.com/v6/latest/USD',{next:{revalidate:21600}})
    if(!r.ok)throw new Error('FX provider unavailable')
    const j=await r.json();const rate=Number(j?.rates?.LKR)
    if(!rate)throw new Error('LKR rate unavailable')
    return Response.json({ok:true,base:'USD',quote:'LKR',rate,updated_at:new Date().toISOString()},{headers:{'Cache-Control':'public, s-maxage=21600, stale-while-revalidate=3600'}})
  }catch(e){return Response.json({ok:false,error:e.message},{status:503})}
}
