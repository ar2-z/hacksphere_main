import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Particles() {
  const particles = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: `${2 + Math.random() * 3}px`,
    duration: `${10 + Math.random() * 15}s`,
    delay: `${Math.random() * 10}s`,
    dx: `${(Math.random() - 0.5) * 200}px`,
    dy: `${-100 - Math.random() * 200}px`,
    color: Math.random() > 0.7 ? 'rgba(139,92,246,0.6)' : 'rgba(139,92,246,0.2)',
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid email or password'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-void">
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-navy items-center justify-center">
        <div className="absolute inset-0 hero-grid hero-grid-radial animate-grid-pulse" />
        <Particles />
        <div className="absolute top-16 left-16 w-80 h-80 bg-accent-violet/8 rounded-full blur-[120px] animate-glow-pulse" />
        <div className="absolute bottom-24 right-12 w-72 h-72 bg-accent-cyan/5 rounded-full blur-[100px] animate-glow-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-navy-lighter/20 rounded-full blur-[80px]" />
        <div className="absolute top-0 left-0 w-56 h-px bg-gradient-to-r from-accent-violet/50 to-transparent" />
        <div className="absolute top-0 left-0 h-56 w-px bg-gradient-to-b from-accent-violet/50 to-transparent" />
        <div className="absolute bottom-0 right-0 w-56 h-px bg-gradient-to-l from-accent-violet/30 to-transparent" />
        <div className="absolute bottom-0 right-0 h-56 w-px bg-gradient-to-t from-accent-violet/30 to-transparent" />
        <div className="absolute top-1/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-accent-violet/5 to-transparent" />

        <div className="relative z-10 text-center px-20 max-w-xl">
          <div className={`inline-flex items-center justify-center mb-12 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="relative animate-float">
              <div className="absolute -inset-8 border border-accent-violet/10 rounded-full" style={{ animation: 'ring-pulse 3s ease-out infinite' }} />
              <div className="absolute -inset-8 border border-accent-violet/10 rounded-full" style={{ animation: 'ring-pulse 3s ease-out infinite 1.5s' }} />
              <div className="relative w-28 h-28 bg-accent-violet/5 border border-accent-violet/20 rounded-3xl flex items-center justify-center shadow-[0_0_80px_rgba(139,92,246,0.12)]">
                <svg className="w-14 h-14 text-accent-violet drop-shadow-[0_0_12px_rgba(139,92,246,0.4)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="absolute -inset-3 border border-accent-violet/15 rounded-[28px] animate-glow-pulse" />
            </div>
          </div>

          <h1
            className={`text-7xl font-bold text-frost mb-5 tracking-tight leading-none animate-text-glow transition-all duration-1000 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Hack<span className="text-accent-violet">Sphere</span>
          </h1>

          <p className={`text-muted text-lg tracking-wide mb-10 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            Enterprise Hackathon Management Platform
          </p>

          <div className={`grid grid-cols-2 gap-3 mb-12 transition-all duration-700 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {[
              { icon: '⚡', label: 'Real-time Quizzes', desc: 'Timed rounds' },
              { icon: '🐛', label: 'Live Debugging', desc: 'Code challenges' },
              { icon: '💡', label: 'Ideathon', desc: 'Pitch & vote' },
              { icon: '📊', label: 'Leaderboards', desc: 'Live rankings' },
            ].map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-3 p-3 bg-accent-violet/[0.03] border border-accent-violet/10 rounded-xl text-left hover:border-accent-violet/20 hover:bg-accent-violet/[0.06] transition-all duration-300 group"
              >
                <span className="text-lg">{f.icon}</span>
                <div>
                  <p className="text-xs font-medium text-frost/80 group-hover:text-frost transition-colors">{f.label}</p>
                  <p className="text-[10px] text-muted/50">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className={`flex items-center justify-center gap-4 transition-all duration-700 delay-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-accent-violet/25" />
            <div className="flex gap-1.5">
              <div className="w-1 h-1 bg-accent-violet/30 rounded-full" />
              <div className="w-1 h-1 bg-accent-violet/50 rounded-full" />
              <div className="w-1 h-1 bg-accent-violet/30 rounded-full" />
            </div>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-accent-violet/25" />
          </div>
        </div>
      </div>

      <div className="w-full lg:w-[45%] flex items-center justify-center px-6 py-12 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-accent-violet/4 rounded-full blur-[120px] lg:hidden" />

        <div className="relative w-full max-w-sm">
          <div className={`lg:hidden text-center mb-10 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="inline-flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-accent-violet/10 border border-accent-violet/30 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.1)]">
                <svg className="w-5 h-5 text-accent-violet" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-2xl font-bold text-frost tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                Hack<span className="text-accent-violet">Sphere</span>
              </span>
            </div>
          </div>

          <div className={`mb-8 transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h2 className="text-2xl font-bold text-frost mb-1.5" style={{ fontFamily: 'var(--font-display)' }}>
              Welcome back
            </h2>
            <p className="text-sm text-muted">
              Sign in to your account to continue
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-red-500/5 border border-red-500/20 rounded-xl animate-fade-in">
              <p className="text-sm text-red-400/90">{error}</p>
            </div>
          )}

          <div className={`animated-border p-7 backdrop-blur-sm transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-muted mb-2 tracking-[0.15em] uppercase">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-void/60 border border-navy-lighter/60 rounded-xl text-frost placeholder-muted/30 focus:outline-none input-glow transition-all duration-300 text-[15px]"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted mb-2 tracking-[0.15em] uppercase">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-void/60 border border-navy-lighter/60 rounded-xl text-frost placeholder-muted/30 focus:outline-none input-glow transition-all duration-300 text-[15px]"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-shimmer w-full py-3.5 mt-3 bg-gradient-to-r from-accent-violet to-accent-cyan text-void font-semibold rounded-xl transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-[15px] tracking-wide hover:shadow-[0_0_40px_rgba(139,92,246,0.25)] hover:scale-[1.01] active:scale-[0.99]"
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

          <div className={`mt-6 text-center space-y-3 transition-all duration-700 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <p className="text-sm text-muted">
              Don't have an account?{' '}
              <Link to="/register" className="text-accent-violet hover:text-frost font-medium transition-colors duration-200">
                Sign up
              </Link>
            </p>

            <button
              type="button"
              onClick={() => setShowAdminHint(!showAdminHint)}
              className="text-xs text-muted/30 hover:text-muted transition-colors duration-200 cursor-pointer"
            >
              Admin access?
            </button>

            {showAdminHint && (
              <div className="p-3.5 bg-navy/50 border border-navy-lighter/40 rounded-xl text-left animate-fade-in-up">
                <p className="text-[10px] text-accent-violet/60 font-medium mb-1.5 tracking-[0.15em] uppercase">Admin Login</p>
                <p className="text-xs text-muted/50 leading-relaxed">
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
