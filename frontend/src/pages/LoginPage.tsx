import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Particles() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: `${2 + Math.random() * 3}px`,
    duration: `${10 + Math.random() * 15}s`,
    delay: `${Math.random() * 10}s`,
    dx: `${(Math.random() - 0.5) * 200}px`,
    dy: `${-100 - Math.random() * 200}px`,
    color: Math.random() > 0.7 ? 'rgba(0,255,255,0.6)' : 'rgba(0,255,255,0.2)',
  }))

  return (
    <>
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: p.left,
            top: p.top,
            '--size': p.size,
            '--duration': p.duration,
            '--delay': p.delay,
            '--dx': p.dx,
            '--dy': p.dy,
            '--color': p.color,
          } as React.CSSProperties}
        />
      ))}
    </>
  )
}

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showAdminHint, setShowAdminHint] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(t)
  }, [])

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
    <div className="min-h-screen flex bg-deep-black">
      {/* ═══════════════ Left Hero Panel ═══════════════ */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-midnight items-center justify-center">
        {/* Grid + radial mask */}
        <div className="absolute inset-0 hero-grid hero-grid-radial animate-grid-pulse" />

        {/* Particles */}
        <Particles />

        {/* Glow orbs */}
        <div className="absolute top-16 left-16 w-80 h-80 bg-cyan/8 rounded-full blur-[120px] animate-glow-pulse" />
        <div className="absolute bottom-24 right-12 w-72 h-72 bg-cyan/5 rounded-full blur-[100px] animate-glow-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-midnight-lighter/20 rounded-full blur-[80px]" />

        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-56 h-px bg-gradient-to-r from-cyan/50 to-transparent" />
        <div className="absolute top-0 left-0 h-56 w-px bg-gradient-to-b from-cyan/50 to-transparent" />
        <div className="absolute bottom-0 right-0 w-56 h-px bg-gradient-to-l from-cyan/30 to-transparent" />
        <div className="absolute bottom-0 right-0 h-56 w-px bg-gradient-to-t from-cyan/30 to-transparent" />

        {/* Horizontal accent lines */}
        <div className="absolute top-1/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan/5 to-transparent" />
        <div className="absolute top-2/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan/3 to-transparent" />

        {/* Content */}
        <div className="relative z-10 text-center px-20 max-w-xl">
          {/* Logo with rings */}
          <div className={`inline-flex items-center justify-center mb-12 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="relative animate-float">
              {/* Outer ring pulse */}
              <div className="absolute -inset-8 border border-cyan/10 rounded-full" style={{ animation: 'ring-pulse 3s ease-out infinite' }} />
              <div className="absolute -inset-8 border border-cyan/10 rounded-full" style={{ animation: 'ring-pulse 3s ease-out infinite 1.5s' }} />

              {/* Logo box */}
              <div className="relative w-28 h-28 bg-cyan/5 border border-cyan/20 rounded-3xl flex items-center justify-center shadow-[0_0_80px_rgba(0,255,255,0.12)]">
                <svg className="w-14 h-14 text-cyan drop-shadow-[0_0_12px_rgba(0,255,255,0.4)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>

              {/* Inner ring */}
              <div className="absolute -inset-3 border border-cyan/15 rounded-[28px] animate-glow-pulse" />
            </div>
          </div>

          {/* Brand name */}
          <h1
            className={`text-7xl font-bold text-white mb-5 tracking-tight leading-none animate-text-glow transition-all duration-1000 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Hack<span className="text-cyan">Sphere</span>
          </h1>

          {/* Tagline */}
          <p className={`text-silver-dim text-lg tracking-wide mb-10 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            Enterprise Hackathon Management Platform
          </p>

          {/* Feature cards */}
          <div className={`grid grid-cols-2 gap-3 mb-12 transition-all duration-700 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {[
              { icon: '⚡', label: 'Real-time Quizzes', desc: 'Timed rounds' },
              { icon: '🐛', label: 'Live Debugging', desc: 'Code challenges' },
              { icon: '💡', label: 'Ideathon', desc: 'Pitch & vote' },
              { icon: '📊', label: 'Leaderboards', desc: 'Live rankings' },
            ].map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-3 p-3 bg-cyan/[0.03] border border-cyan/10 rounded-xl text-left hover:border-cyan/20 hover:bg-cyan/[0.06] transition-all duration-300 group"
              >
                <span className="text-lg">{f.icon}</span>
                <div>
                  <p className="text-xs font-medium text-silver/80 group-hover:text-silver transition-colors">{f.label}</p>
                  <p className="text-[10px] text-silver-dim/50">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Decorative divider */}
          <div className={`flex items-center justify-center gap-4 transition-all duration-700 delay-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-cyan/25" />
            <div className="flex gap-1.5">
              <div className="w-1 h-1 bg-cyan/30 rounded-full" />
              <div className="w-1 h-1 bg-cyan/50 rounded-full" />
              <div className="w-1 h-1 bg-cyan/30 rounded-full" />
            </div>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-cyan/25" />
          </div>
        </div>
      </div>

      {/* ═══════════════ Right Form Panel ═══════════════ */}
      <div className="w-full lg:w-[45%] flex items-center justify-center px-6 py-12 relative">
        {/* Mobile glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-cyan/4 rounded-full blur-[120px] lg:hidden" />

        <div className="relative w-full max-w-sm">
          {/* Mobile-only branding */}
          <div className={`lg:hidden text-center mb-10 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="inline-flex items-center gap-3 mb-3">
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

          {/* Header */}
          <div className={`mb-8 transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h2 className="text-2xl font-bold text-white mb-1.5" style={{ fontFamily: 'var(--font-display)' }}>
              Welcome back
            </h2>
            <p className="text-sm text-silver-dim">
              Sign in to your account to continue
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className={`mb-5 p-3.5 bg-red-500/5 border border-red-500/20 rounded-xl animate-fade-in`}>
              <p className="text-sm text-red-400/90">{error}</p>
            </div>
          )}

          {/* Form card */}
          <div className={`animated-border p-7 backdrop-blur-sm transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-silver-dim mb-2 tracking-[0.15em] uppercase">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-deep-black/60 border border-midnight-lighter/60 rounded-xl text-silver placeholder-silver-dim/30 focus:outline-none input-glow transition-all duration-300 text-[15px]"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-silver-dim mb-2 tracking-[0.15em] uppercase">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-deep-black/60 border border-midnight-lighter/60 rounded-xl text-silver placeholder-silver-dim/30 focus:outline-none input-glow transition-all duration-300 text-[15px]"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-shimmer w-full py-3.5 mt-3 bg-cyan text-deep-black font-semibold rounded-xl transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-[15px] tracking-wide hover:shadow-[0_0_40px_rgba(0,255,255,0.25)] hover:scale-[1.01] active:scale-[0.99]"
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
          </div>

          {/* Footer links */}
          <div className={`mt-6 text-center space-y-3 transition-all duration-700 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <p className="text-sm text-silver-dim">
              Don't have an account?{' '}
              <Link to="/register" className="text-cyan hover:text-white font-medium transition-colors duration-200 relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-px after:bg-cyan hover:after:w-full after:transition-all after:duration-300">
                Sign up
              </Link>
            </p>

            <button
              type="button"
              onClick={() => setShowAdminHint(!showAdminHint)}
              className="text-xs text-silver-dim/30 hover:text-silver-dim transition-colors duration-200 cursor-pointer"
            >
              Admin access?
            </button>

            {showAdminHint && (
              <div className="p-3.5 bg-midnight/50 border border-midnight-lighter/40 rounded-xl text-left animate-fade-in-up">
                <p className="text-[10px] text-cyan/60 font-medium mb-1.5 tracking-[0.15em] uppercase">Admin Login</p>
                <p className="text-xs text-silver-dim/50 leading-relaxed">
                  Enter any email and the admin password to gain admin access. If the email doesn't exist, a new admin account is created automatically.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
