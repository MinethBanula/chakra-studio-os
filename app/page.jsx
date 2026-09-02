'use client'
import {useEffect,useState} from 'react'
import StudioOS from '../components/StudioOS'
import {supabase} from '../lib/supabase'

export default function Page(){
  const [boot,setBoot]=useState(true)
  const [session,setSession]=useState(null)
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [busy,setBusy]=useState(false)
  const [msg,setMsg]=useState('')

  useEffect(()=>{
    let alive=true
    supabase.auth.getSession()
      .then(({data})=>{if(alive)setSession(data.session||null)})
      .catch(e=>{if(alive)setMsg(e?.message||'Could not read session')})
      .finally(()=>{if(alive)setBoot(false)})
    const {data:sub}=supabase.auth.onAuthStateChange((_event,next)=>setSession(next))
    return()=>{alive=false;sub?.subscription?.unsubscribe?.()}
  },[])

  async function login(e){
    e.preventDefault()
    setBusy(true)
    setMsg('')
    try{
      const {data,error}=await supabase.auth.signInWithPassword({email,password})
      if(error)throw error
      setSession(data.session||null)
    }catch(e){
      setMsg(e?.message||'Login failed')
    }finally{
      setBusy(false)
    }
  }

  if(boot)return <div className="preloader"><div className="pulse">C</div></div>
  if(session)return <StudioOS/>

  return <div className="loginScreen">
    <form className="loginCard" onSubmit={login}>
      <div className="loginBrand"><div className="brandMark">C</div><div><div className="brandName">CHAKRA</div><div className="muted small">Studio Operating System</div></div></div>
      <div className="field"><label>Email</label><input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/></div>
      <div style={{height:10}}/>
      <div className="field"><label>Password</label><input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password"/></div>
      {msg&&<div className="muted small" style={{marginTop:10}}>{msg}</div>}
      <button className="btn primary" style={{width:'100%',justifyContent:'center',marginTop:16}} disabled={busy}>{busy?'Please wait…':'Login'}</button>
    </form>
  </div>
}
