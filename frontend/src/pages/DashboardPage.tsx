import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-deep-black">
      <nav className="border-b border-midnight-lighter/40 bg-midnight/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-cyan/10 border border-cyan/30 rounded-lg flex items-center justify-center">
                <svg className="w-4.5 h-4.5 text-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-lg font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                HackSphere
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-silver font-medium">{user?.full_name}</p>
                <div className="flex items-center gap-2 justify-end">
                  {isAdmin && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan/5 border border-cyan/20 rounded-md text-[10px] font-medium text-cyan/80 tracking-wider uppercase">
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Admin
                    </span>
                  )}
                  <p className="text-xs text-silver-dim">{user?.role?.replace('_', ' ')}</p>
                </div>
              </div>
              <div className="w-9 h-9 bg-midnight-light/60 border border-midnight-lighter/60 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-cyan/70">
                  {user?.full_name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-sm text-silver-dim hover:text-silver hover:bg-midnight-light/40 rounded-lg transition-all duration-200 cursor-pointer"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          Welcome back, {user?.full_name?.split(' ')[0]}
        </h1>
        <p className="text-silver-dim mb-10 text-[15px]">
          {isAdmin
            ? 'Manage competitions, teams, and monitor the hackathon in real-time'
            : "Here's your hackathon dashboard"}
        </p>

        {isAdmin ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            {[
              { label: 'Total Teams', value: '—', icon: '👥', accent: 'cyan' },
              { label: 'Active Competitions', value: '—', icon: '🏆', accent: 'cyan' },
              { label: 'Violations', value: '0', icon: '⚠️', accent: 'red' },
              { label: 'Total Participants', value: '—', icon: '📊', accent: 'cyan' },
            ].map((card) => (
              <div
                key={card.label}
                className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-5 hover:border-midnight-lighter/60 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-silver-dim tracking-wider uppercase">{card.label}</span>
                  <span className="text-lg">{card.icon}</span>
                </div>
                <p className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>{card.value}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            {[
              { label: 'My Team', value: '—', icon: '👥' },
              { label: 'Active Phase', value: '—', icon: '🏆' },
              { label: 'Score', value: '0', icon: '⚡' },
              { label: 'Rank', value: '—', icon: '📊' },
            ].map((card) => (
              <div
                key={card.label}
                className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-5 hover:border-midnight-lighter/60 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-silver-dim tracking-wider uppercase">{card.label}</span>
                  <span className="text-lg">{card.icon}</span>
                </div>
                <p className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>{card.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="bg-midnight/30 border border-midnight-lighter/30 rounded-2xl p-10 text-center">
          <div className="w-16 h-16 bg-midnight-light/30 border border-midnight-lighter/40 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-silver-dim/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            No Active Competition
          </h3>
          <p className="text-sm text-silver-dim/70 max-w-md mx-auto leading-relaxed">
            {isAdmin
              ? 'Create a competition or start an existing one to begin the hackathon. Teams will be able to participate in quiz rounds, debugging challenges, and ideathon presentations.'
              : 'Join a hackathon team or wait for an admin to start a competition. Once active, quiz rounds, debugging challenges, and presentations will appear here.'}
          </p>
        </div>
      </main>
    </div>
  )
}
