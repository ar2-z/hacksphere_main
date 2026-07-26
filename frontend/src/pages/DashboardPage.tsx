import { useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useFetch } from '../lib/hooks'
import { useAuth } from '../context/AuthContext'
import type { Competition, Announcement, Leaderboard, AdminDashboard } from '../lib/types'

const quickActions = [
  { to: '/quiz', label: 'Quiz Rounds', desc: 'Test your knowledge', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { to: '/debugging', label: 'Debugging', desc: 'Fix the bugs', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
  { to: '/ideathon', label: 'Ideathon', desc: 'Pitch your ideas', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
  { to: '/leaderboard', label: 'Leaderboard', desc: 'See rankings', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
]

export default function DashboardPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'

  const [competitionId, setCompetitionId] = useState<string>('')
  const { data: competitionsRes, loading: compLoading } = useFetch<{ data: Competition[]; total: number } | Competition[]>('/competitions/')
  const competitions: Competition[] = Array.isArray(competitionsRes) ? competitionsRes : competitionsRes?.data ?? []
  const { data: adminStats } = useFetch<AdminDashboard>(
    isAdmin && competitionId ? `/admin/dashboard/${competitionId}` : null,
    [competitionId]
  )
  const { data: leaderboard } = useFetch<Leaderboard>(
    !isAdmin && competitionId ? `/scores/leaderboard/${competitionId}` : null,
    [competitionId]
  )
  const { data: announcementsRes } = useFetch<{ data: Announcement[] } | Announcement[]>(
    competitionId ? `/admin/announcements/${competitionId}` : null,
    [competitionId]
  )
  const announcements: Announcement[] = Array.isArray(announcementsRes) ? announcementsRes : announcementsRes?.data ?? []

  const activeCompetitions = competitions.filter((c) => c.status === 'active') ?? []
  const allCompetitions = competitions ?? []

  if (!isAdmin && !compLoading && allCompetitions.length > 0 && !competitionId) {
    const active = activeCompetitions[0] || allCompetitions[0]
    if (active) setCompetitionId(active.id.toString())
  }

  const myRank = leaderboard?.entries?.[0]

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Welcome back, {user?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-silver-dim text-[15px]">
            {isAdmin
              ? 'Manage competitions, teams, and monitor the hackathon in real-time'
              : "Here's your hackathon dashboard"}
          </p>
        </div>

        {allCompetitions.length > 0 && (
          <div className="flex items-center gap-4">
            <label className="text-sm text-silver-dim">Competition</label>
            <select
              value={competitionId}
              onChange={(e) => setCompetitionId(e.target.value)}
              className="bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver focus:outline-none focus:border-cyan/30 input-glow appearance-none"
            >
              <option value="">Select a competition</option>
              {allCompetitions.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
              ))}
            </select>
            {activeCompetitions.length > 0 && (
              <span className="text-xs text-emerald-400 font-medium">
                {activeCompetitions.length} active
              </span>
            )}
          </div>
        )}

        {isAdmin && competitionId && adminStats ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up">
            {[
              { label: 'Total Teams', value: adminStats.total_teams, icon: '👥' },
              { label: 'Active Competitions', value: adminStats.active_competitions, icon: '🏆' },
              { label: 'Violations', value: adminStats.total_violations, icon: '⚠️' },
              { label: 'Participants', value: adminStats.total_participants, icon: '📊' },
            ].map((card) => (
              <div key={card.label} className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-5 hover:border-midnight-lighter/60 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-silver-dim tracking-wider uppercase">{card.label}</span>
                  <span className="text-lg">{card.icon}</span>
                </div>
                <p className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>{card.value}</p>
              </div>
            ))}
          </div>
        ) : !isAdmin && competitionId && leaderboard ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up">
            {[
              { label: 'My Team', value: myRank?.team_name || '—', icon: '👥' },
              { label: 'Active Phase', value: activeCompetitions[0]?.phases?.find((p) => p.status === 'active')?.name || '—', icon: '🏆' },
              { label: 'Score', value: myRank?.total_score?.toString() || '0', icon: '⚡' },
              { label: 'Rank', value: myRank?.rank ? `#${myRank.rank}` : '—', icon: '📊' },
            ].map((card) => (
              <div key={card.label} className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-5 hover:border-midnight-lighter/60 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-silver-dim tracking-wider uppercase">{card.label}</span>
                  <span className="text-lg">{card.icon}</span>
                </div>
                <p className="text-2xl font-bold text-white truncate" style={{ fontFamily: 'var(--font-display)' }}>{card.value}</p>
              </div>
            ))}
          </div>
        ) : !competitionId && allCompetitions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up">
            {[
              { label: 'My Team', value: '—', icon: '👥' },
              { label: 'Active Phase', value: '—', icon: '🏆' },
              { label: 'Score', value: '0', icon: '⚡' },
              { label: 'Rank', value: '—', icon: '📊' },
            ].map((card) => (
              <div key={card.label} className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-5 hover:border-midnight-lighter/60 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-silver-dim tracking-wider uppercase">{card.label}</span>
                  <span className="text-lg">{card.icon}</span>
                </div>
                <p className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>{card.value}</p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up">
            {quickActions.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-5 hover:border-cyan/20 hover:bg-midnight-light/20 transition-all duration-300 group"
              >
                <div className="w-10 h-10 bg-cyan/10 border border-cyan/20 rounded-lg flex items-center justify-center mb-3 group-hover:bg-cyan/15 transition-colors">
                  <svg className="w-5 h-5 text-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={action.icon} />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">{action.label}</h3>
                <p className="text-xs text-silver-dim">{action.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {announcements && announcements.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Recent Announcements
            </h2>
            <div className="space-y-3 animate-fade-in-up">
              {announcements.slice(0, 5).map((a) => (
                <div key={a.id} className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-5 hover:border-midnight-lighter/60 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {a.is_pinned && (
                          <svg className="w-3 h-3 text-cyan shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                          </svg>
                        )}
                        <h3 className="text-sm font-semibold text-white">{a.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          a.priority === 'critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          a.priority === 'high' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                          a.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                          'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {a.priority}
                        </span>
                      </div>
                      <p className="text-sm text-silver-dim line-clamp-2">{a.content}</p>
                    </div>
                    <span className="text-xs text-silver-dim whitespace-nowrap">
                      {new Date(a.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {allCompetitions.length === 0 && !compLoading && (
          <div className="bg-midnight/30 border border-midnight-lighter/30 rounded-2xl p-10 text-center animate-fade-in-up">
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
        )}
      </div>
    </Layout>
  )
}
