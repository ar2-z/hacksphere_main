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
    <div className="min-h-screen flex bg-deep-black">
      {/* Left Hero Panel */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-midnight items-center justify-center">
        {/* Grid background */}
        <div className="absolute inset-0 hero-grid animate-grid-pulse" />

        {/* Glow orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-cyan/8 rounded-full blur-[100px] animate-glow-pulse" />
        <div className="absolute bottom-32 right-16 w-64 h-64 bg-cyan/5 rounded-full blur-[80px] animate-glow-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-midnight-lighter/30 rounded-full blur-[60px]" />

        {/* Corner accent lines */}
        <div className="absolute top-0 left-0 w-40 h-px bg-gradient-to-r from-cyan/40 to-transparent" />
        <div className="absolute top-0 left-0 h-40 w-px bg-gradient-to-b from-cyan/40 to-transparent" />
        <div className="absolute bottom-0 right-0 w-40 h-px bg-gradient-to-l from-cyan/40 to-transparent" />
        <div className="absolute bottom-0 right-0 h-40 w-px bg-gradient-to-t from-cyan/40 to-transparent" />

        {/* Content */}
        <div className="relative z-10 text-center px-16 max-w-xl">
          {/* Logo mark */}
          <div className="inline-flex items-center justify-center mb-10 animate-float">
            <div className="relative">
              <div className="w-24 h-24 bg-cyan/5 border border-cyan/20 rounded-3xl flex items-center justify-center shadow-[0_0_60px_rgba(0,255,255,0.15)]">
                <svg className="w-12 h-12 text-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="absolute -inset-4 border border-cyan/10 rounded-[28px] animate-glow-pulse" />
            </div>
          </div>

          {/* Brand name */}
          <h1
            className="text-6xl font-bold text-white mb-4 tracking-tight leading-none"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Hack<span className="text-cyan">Sphere</span>
          </h1>

          {/* Tagline */}
          <p className="text-silver-dim text-lg tracking-wide mb-8">
            Enterprise Hackathon Management Platform
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mt-12">
            {[
              { value: '50+', label: 'Teams' },
              { value: '3', label: 'Phases' },
              { value: '∞', label: 'Ideas' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-cyan mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                  {stat.value}
                </p>
                <p className="text-xs text-silver-dim/60 tracking-wider uppercase">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Bottom decorative line */}
          <div className="mt-14 flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-cyan/30" />
            <div className="w-1.5 h-1.5 bg-cyan/30 rounded-full" />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-cyan/30" />
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="w-full lg:w-[45%] flex items-center justify-center px-6 py-10 relative">
        {/* Subtle bg accent for mobile */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-cyan/3 rounded-full blur-[100px] lg:hidden" />

        <div className="relative w-full max-w-sm">
          {/* Mobile-only branding */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-cyan/10 border border-cyan/30 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(0,255,255,0.1)]">
                <svg className="w-5 h-5 text-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                Hack<span className="text-cyan">Sphere</span>
              </span>
            </div>
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-bold text-white mb-1.5" style={{ fontFamily: 'var(--font-display)' }}>
              Create account
            </h2>
            <p className="text-sm text-silver-dim">
              Join the hackathon and start building
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3.5 bg-red-500/5 border border-red-500/20 rounded-xl">
              <p className="text-sm text-red-400/90">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-silver-dim mb-1.5 tracking-wider uppercase">Full Name</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => update('full_name', e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-midnight/40 border border-midnight-lighter/60 rounded-xl text-silver placeholder-silver-dim/40 focus:outline-none focus:border-cyan/40 focus:shadow-[0_0_0_3px_rgba(0,255,255,0.05)] transition-all duration-300 text-[15px]"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-silver-dim mb-1.5 tracking-wider uppercase">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => update('username', e.target.value)}
                required
                minLength={3}
                className="w-full px-4 py-2.5 bg-midnight/40 border border-midnight-lighter/60 rounded-xl text-silver placeholder-silver-dim/40 focus:outline-none focus:border-cyan/40 focus:shadow-[0_0_0_3px_rgba(0,255,255,0.05)] transition-all duration-300 text-[15px]"
                placeholder="johndoe"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-silver-dim mb-1.5 tracking-wider uppercase">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-midnight/40 border border-midnight-lighter/60 rounded-xl text-silver placeholder-silver-dim/40 focus:outline-none focus:border-cyan/40 focus:shadow-[0_0_0_3px_rgba(0,255,255,0.05)] transition-all duration-300 text-[15px]"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-silver-dim mb-1.5 tracking-wider uppercase">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-2.5 bg-midnight/40 border border-midnight-lighter/60 rounded-xl text-silver placeholder-silver-dim/40 focus:outline-none focus:border-cyan/40 focus:shadow-[0_0_0_3px_rgba(0,255,255,0.05)] transition-all duration-300 text-[15px]"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-silver-dim mb-1.5 tracking-wider uppercase">Confirm Password</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => update('confirmPassword', e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-2.5 bg-midnight/40 border border-midnight-lighter/60 rounded-xl text-silver placeholder-silver-dim/40 focus:outline-none focus:border-cyan/40 focus:shadow-[0_0_0_3px_rgba(0,255,255,0.05)] transition-all duration-300 text-[15px]"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 bg-cyan text-deep-black font-semibold rounded-xl transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-[15px] tracking-wide hover:shadow-[0_0_30px_rgba(0,255,255,0.2)] hover:bg-cyan-dim"
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

          <div className="mt-6 text-center">
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
