import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-lg font-bold text-white">HackSphere</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-white font-medium">{user?.full_name}</p>
                <p className="text-xs text-gray-400">{user?.role?.replace('_', ' ')}</p>
              </div>
              <div className="w-9 h-9 bg-indigo-600/20 border border-indigo-500/30 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-indigo-400">
                  {user?.full_name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-bold text-white mb-2">Welcome back, {user?.full_name?.split(' ')[0]}</h1>
        <p className="text-gray-400 mb-8">Here's your hackathon dashboard</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            { label: 'My Team', value: '—', icon: '👥', color: 'from-blue-500/20 to-blue-600/10' },
            { label: 'Active Phase', value: '—', icon: '🏆', color: 'from-indigo-500/20 to-indigo-600/10' },
            { label: 'Score', value: '0', icon: '⚡', color: 'from-purple-500/20 to-purple-600/10' },
            { label: 'Rank', value: '—', icon: '📊', color: 'from-emerald-500/20 to-emerald-600/10' },
          ].map((card) => (
            <div
              key={card.label}
              className={`bg-gradient-to-br ${card.color} border border-gray-800 rounded-xl p-5`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-400">{card.label}</span>
                <span className="text-xl">{card.icon}</span>
              </div>
              <p className="text-2xl font-bold text-white">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No Active Competition</h3>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Join a hackathon team or wait for an admin to start a competition. Once active, quiz rounds, debugging challenges, and presentations will appear here.
          </p>
        </div>
      </main>
    </div>
  )
}
