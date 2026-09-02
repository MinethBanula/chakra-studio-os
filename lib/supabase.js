import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) throw new Error('Supabase public configuration is missing')

const base = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
})

let schemaCache = null
let schemaPromise = null

export async function warmSchemaGuard(){
  if(schemaCache) return schemaCache
  if(schemaPromise) return schemaPromise
  schemaPromise = fetch(`${url}/rest/v1/`, {
    headers:{ apikey:key, Authorization:`Bearer ${key}`, Accept:'application/openapi+json' },
    cache:'no-store'
  }).then(async r=>{
    if(!r.ok) throw new Error(`Schema fetch failed (${r.status})`)
    const spec=await r.json()
    const defs=spec.definitions||spec.components?.schemas||{}
    const out={}
    for(const [name,def] of Object.entries(defs)) out[name]=new Set(Object.keys(def?.properties||{}))
    schemaCache=out
    return out
  }).catch(err=>{
    console.warn('[Chakra] live schema guard unavailable:',err?.message||err)
    return null
  })
  return schemaPromise
}

const ALIASES={
  chakra_subscriptions:{
    amount_original:['amount','amount_usd','original_amount'],
    website:['website_url','url','site_url'],
    billing_cycle:['billing_cycle','billing_period'],
    next_renewal:['next_renewal','renewal_date'],
    auto_post:['auto_post','auto_post_finance'],
    cancel_reminder_enabled:['cancel_reminder_enabled','reminder_enabled'],
    cancel_reminder_days:['cancel_reminder_days','reminder_days']
  },
  chakra_projects:{
    type:['type','project_type'],
    drive_url:['drive_url','google_drive_url'],
    portal_summary:['portal_summary','client_summary'],
    portal_progress:['portal_progress','client_progress']
  },
  chakra_clients:{
    contact_name:['contact_name','contact','contact_person'],
    phone:['phone','phone_number'],
    status:['status','client_status']
  },
  chakra_meetings:{
    start_at:['start_at','starts_at','start_time'],
    meeting_url:['meeting_url','url','meet_url'],
    attendee_names:['attendee_names','attendees'],
    attendee_emails:['attendee_emails']
  },
  chakra_finance_entries:{
    payment_method:['payment_method','method'],
    sourced_by:['sourced_by','brought_in_by'],
    paid_to:['paid_to','paid_to_user_id']
  },
  chakra_invoices:{
    total:['total','total_amount'],
    previous_payments:['previous_payments','previous_paid_amount']
  },
  chakra_members:{
    full_name:['full_name','name'],
    avatar_url:['avatar_url','profile_photo_url']
  }
}

function normalizePayload(table,input){
  const cols=schemaCache?.[table]
  if(!cols) return input
  const aliases=ALIASES[table]||{}
  const normalize=row=>{
    if(!row||typeof row!=='object'||Array.isArray(row)) return row
    const out={}
    for(const [keyName,value] of Object.entries(row)){
      if(cols.has(keyName)){ out[keyName]=value; continue }
      const candidates=aliases[keyName]||[]
      const match=candidates.find(c=>cols.has(c))
      if(match){ out[match]=value; continue }
      if(value!==undefined) console.info(`[Chakra schema guard] dropped ${table}.${keyName}`)
    }
    return out
  }
  return Array.isArray(input)?input.map(normalize):normalize(input)
}

warmSchemaGuard()

export const supabase = new Proxy(base, {
  get(target, prop, receiver){
    if(prop!=='from') return Reflect.get(target,prop,receiver)
    return table=>{
      const builder=target.from(table)
      return new Proxy(builder,{
        get(b,p,r){
          if(p==='insert') return (payload,options)=>b.insert(normalizePayload(table,payload),options)
          if(p==='update') return (payload,options)=>b.update(normalizePayload(table,payload),options)
          if(p==='upsert') return (payload,options)=>b.upsert(normalizePayload(table,payload),options)
          return Reflect.get(b,p,r)
        }
      })
    }
  }
})
