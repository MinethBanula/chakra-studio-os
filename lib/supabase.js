import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) throw new Error('Supabase public configuration is missing')

const base = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
})

function normalizeSubscriptionPayload(input){
  const fix = (row) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return row
    const next = { ...row }
    if (Object.prototype.hasOwnProperty.call(next, 'amount_original')) {
      next.amount = next.amount_original
      delete next.amount_original
    }
    return next
  }
  return Array.isArray(input) ? input.map(fix) : fix(input)
}

export const supabase = new Proxy(base, {
  get(target, prop, receiver){
    if (prop !== 'from') return Reflect.get(target, prop, receiver)
    return (table) => {
      const builder = target.from(table)
      if (table !== 'chakra_subscriptions') return builder
      return new Proxy(builder, {
        get(b, p, r){
          if (p === 'insert') return (payload, options) => b.insert(normalizeSubscriptionPayload(payload), options)
          if (p === 'update') return (payload, options) => b.update(normalizeSubscriptionPayload(payload), options)
          if (p === 'upsert') return (payload, options) => b.upsert(normalizeSubscriptionPayload(payload), options)
          return Reflect.get(b, p, r)
        }
      })
    }
  }
})
