import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: '',
    username: '',
    full_name: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      await register({
        email: form.email,
        username: form.username,
        full_name: form.full_name,
        password: form.password,
      })
      navigate('/login')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-deep-black relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-cyan/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-midnight-light/40 rounded-full blur-[100px]" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan/20 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan/10 to-transparent" />
      </div>

      <div className="relative w-full max-w-md px-6 py-8">
        <div className="text-center mb-8">
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
          <p className="text-silver-dim text-sm tracking-wide uppercase">Create your account</p>
        </div>

        <div className="bg-midnight/60 backdrop-blur-xl border border-midnight-lighter/50 rounded-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          {error && (
            <div className="mb-5 p-3.5 bg-red-500/5 border border-red-500/20 rounded-xl">
              <p className="text-sm text-red-400/90">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-silver-dim mb-2 tracking-wider uppercase">Full Name</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => update('full_name', e.target.value)}
                required
                className="w-full px-4 py-3 bg-deep-black/60 border border-midnight-lighter/60 rounded-xl text-silver placeholder-silver-dim/40 focus:outline-none focus:border-cyan/40 focus:shadow-[0_0_0_3px_rgba(0,255,255,0.05)] transition-all duration-300 text-[15px]"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-silver-dim mb-2 tracking-wider uppercase">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => update('username', e.target.value)}
                required
                minLength={3}
                className="w-full px-4 py-3 bg-deep-black/60 border border-midnight-lighter/60 rounded-xl text-silver placeholder-silver-dim/40 focus:outline-none focus:border-cyan/40 focus:shadow-[0_0_0_3px_rgba(0,255,255,0.05)] transition-all duration-300 text-[15px]"
                placeholder="johndoe"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-silver-dim mb-2 tracking-wider uppercase">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                required
                className="w-full px-4 py-3 bg-deep-black/60 border border-midnight-lighter/60 rounded-xl text-silver placeholder-silver-dim/40 focus:outline-none focus:border-cyan/40 focus:shadow-[0_0_0_3px_rgba(0,255,255,0.05)] transition-all duration-300 text-[15px]"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-silver-dim mb-2 tracking-wider uppercase">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 bg-deep-black/60 border border-midnight-lighter/60 rounded-xl text-silver placeholder-silver-dim/40 focus:outline-none focus:border-cyan/40 focus:shadow-[0_0_0_3px_rgba(0,255,255,0.05)] transition-all duration-300 text-[15px]"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-silver-dim mb-2 tracking-wider uppercase">Confirm Password</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => update('confirmPassword', e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 bg-deep-black/60 border border-midnight-lighter/60 rounded-xl text-silver placeholder-silver-dim/40 focus:outline-none focus:border-cyan/40 focus:shadow-[0_0_0_3px_rgba(0,255,255,0.05)] transition-all duration-300 text-[15px]"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-1 bg-cyan/10 hover:bg-cyan/20 border border-cyan/30 hover:border-cyan/50 disabled:opacity-40 text-cyan font-medium rounded-xl transition-all duration-300 cursor-pointer disabled:cursor-not-allowed text-[15px] tracking-wide hover:shadow-[0_0_20px_rgba(0,255,255,0.1)]"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account...
                </span>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <div className="mt-7 text-center">
            <p className="text-sm text-silver-dim">
              Already have an account?{' '}
              <Link to="/login" className="text-cyan hover:text-cyan-dim font-medium transition-colors duration-200">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
