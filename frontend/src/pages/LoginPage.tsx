import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showAdminHint, setShowAdminHint] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-deep-black relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-midnight-light/40 rounded-full blur-[100px]" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan/20 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan/10 to-transparent" />
      </div>

      <div className="relative w-full max-w-md px-6">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-5">
            <div className="w-11 h-11 bg-cyan/10 border border-cyan/30 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(0,255,255,0.1)]">
              <svg className="w-6 h-6 text-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-3xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              HackSphere
            </span>
          </div>
          <p className="text-silver-dim text-sm tracking-wide uppercase">Sign in to your account</p>
        </div>

        <div className="bg-midnight/60 backdrop-blur-xl border border-midnight-lighter/50 rounded-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          {error && (
            <div className="mb-5 p-3.5 bg-red-500/5 border border-red-500/20 rounded-xl">
              <p className="text-sm text-red-400/90">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-silver-dim mb-2 tracking-wider uppercase">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-deep-black/60 border border-midnight-lighter/60 rounded-xl text-silver placeholder-silver-dim/40 focus:outline-none focus:border-cyan/40 focus:shadow-[0_0_0_3px_rgba(0,255,255,0.05)] transition-all duration-300 text-[15px]"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-silver-dim mb-2 tracking-wider uppercase">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-deep-black/60 border border-midnight-lighter/60 rounded-xl text-silver placeholder-silver-dim/40 focus:outline-none focus:border-cyan/40 focus:shadow-[0_0_0_3px_rgba(0,255,255,0.05)] transition-all duration-300 text-[15px]"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-cyan/10 hover:bg-cyan/20 border border-cyan/30 hover:border-cyan/50 disabled:opacity-40 text-cyan font-medium rounded-xl transition-all duration-300 cursor-pointer disabled:cursor-not-allowed text-[15px] tracking-wide hover:shadow-[0_0_20px_rgba(0,255,255,0.1)]"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="mt-7 text-center space-y-3">
            <p className="text-sm text-silver-dim">
              Don't have an account?{' '}
              <Link to="/register" className="text-cyan hover:text-cyan-dim font-medium transition-colors duration-200">
                Sign up
              </Link>
            </p>

            <button
              type="button"
              onClick={() => setShowAdminHint(!showAdminHint)}
              className="text-xs text-silver-dim/50 hover:text-silver-dim transition-colors duration-200 cursor-pointer"
            >
              Admin access?
            </button>

            {showAdminHint && (
              <div className="p-3.5 bg-midnight-light/30 border border-midnight-lighter/40 rounded-xl text-left">
                <p className="text-xs text-cyan/80 font-medium mb-1 tracking-wide uppercase">Admin Login</p>
                <p className="text-xs text-silver-dim/70 leading-relaxed">
                  Enter any email and the admin password to gain admin access. If the email doesn't exist, a new admin account is created automatically.
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="mt-8 text-center text-[11px] text-silver-dim/30 tracking-widest uppercase">
          Enterprise Hackathon Management Platform
        </p>
      </div>
    </div>
  )
}
