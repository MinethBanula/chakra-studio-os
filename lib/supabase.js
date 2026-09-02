import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) throw new Error('Supabase public configuration is missing')

const base = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
})

const ALIASES={
  chakra_subscriptions:{amount_original:'amount',website:'url'},
  chakra_projects:{type:'project_type'},
  chakra_clients:{contact_name:'contact'},
  chakra_meetings:{start_at:'starts_at',meeting_url:'url'},
  chakra_finance_entries:{payment_method:'method'},
  chakra_invoices:{total:'total_amount'},
  chakra_members:{full_name:'name'}
}

const READ_ALIASES={
  chakra_subscriptions:{
    website:['website','website_url','url','site_url'],
    amount_original:['amount_original','amount','amount_usd','original_amount']
  },
  chakra_projects:{
    type:['type','project_type'],
    drive_url:['drive_url','google_drive_url'],
    portal_summary:['portal_summary','client_summary'],
    portal_progress:['portal_progress','client_progress']
  },
  chakra_clients:{
    contact_name:['contact_name','contact','contact_person'],
    phone:['phone','phone_number']
  },
  chakra_meetings:{
    start_at:['start_at','starts_at','start_time'],
    meeting_url:['meeting_url','url','meet_url']
  },
  chakra_finance_entries:{
    payment_method:['payment_method','method'],
    sourced_by:['sourced_by','brought_in_by']
  },
  chakra_invoices:{
    total:['total','total_amount']
  },
  chakra_members:{
    full_name:['full_name','name'],
    avatar_url:['avatar_url','profile_photo_url']
  }
}

function cloneRows(input){
  const clone=row=>row&&typeof row==='object'&&!Array.isArray(row)?{...row}:row
  return Array.isArray(input)?input.map(clone):clone(input)
}

function applyAliases(table,input){
  const map=ALIASES[table]||{}
  const fix=row=>{
    if(!row||typeof row!=='object'||Array.isArray(row))return row
    const next={...row}
    for(const [from,to] of Object.entries(map)){
      if(Object.prototype.hasOwnProperty.call(next,from)&&!Object.prototype.hasOwnProperty.call(next,to)){
        next[to]=next[from]
        delete next[from]
      }
    }
    return next
  }
  return Array.isArray(input)?input.map(fix):fix(input)
}

function normalizeRead(table,input){
  const map=READ_ALIASES[table]||{}
  const fix=row=>{
    if(!row||typeof row!=='object'||Array.isArray(row))return row
    const next={...row}
    for(const [canonical,candidates] of Object.entries(map)){
      if(next[canonical]!==undefined&&next[canonical]!==null&&next[canonical]!=='')continue
      const source=candidates.find(k=>next[k]!==undefined&&next[k]!==null&&next[k]!=='')
      if(source)next[canonical]=next[source]
    }
    return next
  }
  return Array.isArray(input)?input.map(fix):fix(input)
}

function removeField(input,field){
  const fix=row=>{
    if(!row||typeof row!=='object'||Array.isArray(row))return row
    const next={...row};delete next[field];return next
  }
  return Array.isArray(input)?input.map(fix):fix(input)
}

function missingColumn(error){
  const msg=error?.message||''
  const a=msg.match(/Could not find the '([^']+)' column of '([^']+)' in the schema cache/i)
  if(a)return a[1]
  const b=msg.match(/column ["']?([a-zA-Z0-9_]+)["']? .* does not exist/i)
  return b?.[1]||null
}

function resilientWrite(table,method,payload,options){
  let clean=applyAliases(table,cloneRows(payload))
  const chain=[]
  let proxy

  async function execute(){
    for(let attempt=0;attempt<12;attempt++){
      let q=base.from(table)[method](clean,options)
      for(const [name,args] of chain){
        if(typeof q?.[name]==='function')q=q[name](...args)
      }
      const result=await q
      const field=missingColumn(result?.error)
      if(!field){
        if(result?.data)result.data=normalizeRead(table,result.data)
        return result
      }
      const before=JSON.stringify(clean)
      clean=removeField(clean,field)
      const after=JSON.stringify(clean)
      console.warn(`[Chakra schema retry] removed ${table}.${field}`)
      if(before===after)return result
    }
    return {data:null,error:new Error(`Too many schema retries for ${table}`)}
  }

  proxy=new Proxy({}, {
    get(_target,prop){
      if(prop==='then')return (resolve,reject)=>execute().then(resolve,reject)
      if(prop==='catch')return reject=>execute().catch(reject)
      if(prop==='finally')return cb=>execute().finally(cb)
      return (...args)=>{chain.push([prop,args]);return proxy}
    }
  })
  return proxy
}

function normalizedRead(table,builder){
  return new Proxy(builder,{
    get(target,prop,receiver){
      if(prop==='then')return (resolve,reject)=>target.then(result=>{
        if(result?.data)result.data=normalizeRead(table,result.data)
        return result
      }).then(resolve,reject)
      if(prop==='catch')return reject=>target.catch(reject)
      if(prop==='finally')return cb=>target.finally(cb)
      const value=Reflect.get(target,prop,receiver)
      if(typeof value==='function')return (...args)=>normalizedRead(table,value.apply(target,args))
      return value
    }
  })
}

export async function warmSchemaGuard(){return true}

export const supabase=new Proxy(base,{
  get(target,prop,receiver){
    if(prop!=='from')return Reflect.get(target,prop,receiver)
    return table=>{
      const builder=target.from(table)
      return new Proxy(builder,{
        get(b,p,r){
          if(p==='insert'||p==='update'||p==='upsert')return (payload,options)=>resilientWrite(table,p,payload,options)
          if(p==='select')return (...args)=>normalizedRead(table,b.select(...args))
          return Reflect.get(b,p,r)
        }
      })
    }
  }
})
