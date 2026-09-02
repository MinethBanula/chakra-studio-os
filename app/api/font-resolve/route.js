export async function POST(req){
  try{
    const {url}=await req.json();const u=new URL(url)
    if(u.hostname!=='fonts.googleapis.com')return Response.json({ok:false,error:'Only fonts.googleapis.com URLs are allowed'},{status:400})
    const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0'},cache:'no-store'});if(!r.ok)throw new Error('Google Fonts CSS fetch failed')
    const css=await r.text();const matches=[...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map(m=>m[1])
    if(!matches.length)throw new Error('No downloadable font file found')
    return Response.json({ok:true,font_url:matches[0],all:matches})
  }catch(e){return Response.json({ok:false,error:e.message},{status:400})}
}
