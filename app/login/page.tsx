'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await signIn('credentials', {
      email, password, redirect: false,
    })
    setLoading(false)
    if (res?.error) {
      setError('Invalid email or password. Please try again.')
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0c14] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img src="/riznex_logo.jpg" alt="Riznex Digital Solutions" className="w-24 h-24 rounded-2xl object-contain bg-white shadow-2xl shadow-blue-500/10 p-2" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide uppercase">Riznex</h1>
          <p className="text-blue-400 text-sm mt-1 font-semibold tracking-widest">DIGITAL SOLUTIONS</p>
        </div>

        {/* Card */}
        <div className="bg-[#111520] border border-[#1f2947] rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-bold text-white mb-6">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Email address</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-4 py-3 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                placeholder="you@restaurant.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Password</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-4 py-3 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-blue-500/25 hover:opacity-90 disabled:opacity-50 transition-all duration-200 active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Signing in…
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#1f2947]">
            <p className="text-xs text-slate-500 text-center">
              Powered by <span className="text-blue-400 font-semibold">Riznex</span> · Secure local authentication
            </p>
          </div>
        </div>

        {/* Demo credentials */}
        <div className="mt-4 bg-[#111520]/50 border border-[#1f2947] rounded-xl p-4 text-xs text-slate-400">
          <p className="font-semibold text-slate-300 mb-2">🔑 Demo Credentials</p>
          <p><span className="text-slate-300">Admin:</span> admin@riznex.com / admin123</p>
          <p><span className="text-slate-300">Hungry Birds:</span> hungrybirdsmcr@gmail.com / client1pass</p>
          <p><span className="text-slate-300">Henley:</span> henley@example.com / henleypass</p>
        </div>
      </div>
    </div>
  )
}
