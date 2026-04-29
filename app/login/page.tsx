'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
export default function LoginPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMessage(error.message); else window.location.href = '/dashboard'
    setLoading(false)
  }
  async function handleSignup() {
    setLoading(true); setMessage('')
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { setMessage(error.message); setLoading(false); return }
    const user = data.user
    if (user) await supabase.from('profiles').upsert({ id: user.id, email: user.email, company_name: '1 Stop Turnover Specialist LLC' })
    setMessage('Account created. Sign in now.'); setLoading(false)
  }
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-100">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <div className="text-xs uppercase tracking-[0.22em] text-amber-600 font-bold">1 Stop Turnover Specialist LLC</div>
        <h1 className="text-3xl font-bold mt-2">1 Stop Payroll Pro</h1>
        <p className="mt-2 text-sm text-slate-500">Sign in to manage your payroll and crew.</p>
        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <input className="w-full rounded-2xl border border-slate-300 px-4 py-3" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="w-full rounded-2xl border border-slate-300 px-4 py-3" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-white" disabled={loading}>{loading ? 'Please wait...' : 'Sign In'}</button>
        </form>
        <button onClick={handleSignup} className="mt-3 w-full rounded-2xl border border-slate-300 px-4 py-3" disabled={loading}>Create Account</button>
        {message ? <p className="mt-4 text-sm text-amber-700">{message}</p> : null}
      </div>
    </main>
  )
}
