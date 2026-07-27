import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useFetch } from '../lib/hooks'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import type { Competition, Announcement, Leaderboard, Score } from '../lib/types'

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
  const [mounted] = useState(true)

  const { data: competitions, loading: compLoading } = useFetch<Competition[]>('competitions', { filters: { is_active: true } })
  const { data: announcements } = useFetch<Announcement[]>('announcements', competitionId ? { filters: { competition_id: competitionId, is_active: true }, order: { column: 'created_at', ascending: false }, limit: 5 } : undefined, [competitionId])
  const { data: scores } = useFetch<Score[]>('scores', competitionId ? { filters: { competition_id: competitionId }, order: { column: 'updated_at', ascending: false } } : undefined, [competitionId])

  const allCompetitions = competitions ?? []
  const activeCompetitions = allCompetitions.filter((c) => c.is_active)

  useEffect(() => {
    if (!compLoading && allCompetitions.length > 0 && !competitionId) {
      const active = activeCompetitions[0] || allCompetitions[0]
      if (active) setCompetitionId(active.id)
    }
  }, [compLoading, allCompetitions, activeCompetitions, competitionId])

  const myScore = scores?.find((s) => s.team_id)

  return (
    <Layout>
      <div className="space-y-8">
        <div className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h1 className="text-3xl font-bold text-frost mb-1 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Welcome back, {user?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-muted text-[15px]">
            {isAdmin
              ? 'Manage competitions, teams, and monitor the hackathon in real-time'
              : "Here's your hackathon dashboard"}
          </p>
        </div>

        {allCompetitions.length > 0 && (
          <div className="flex items-center gap-4">
            <label className="text-sm text-muted">Competition</label>
            <select
              value={competitionId}
              onChange={(e) => setCompetitionId(e.target.value)}
              className="bg-void/60 border border-navy-lighter/60 rounded-lg px-4 py-2.5 text-sm text-frost focus:outline-none focus:border-accent-violet/30 input-glow appearance-none cursor-pointer"
            >
              <option value="">Select a competition</option>
              {allCompetitions.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.current_phase})</option>
              ))}
            </select>
            {activeCompetitions.length > 0 && (
              <span className="text-xs text-accent-cyan font-medium">
                {activeCompetitions.length} active
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up">
          {(isAdmin
            ? [
                { label: 'Current Phase', value: allCompetitions.find((c) => c.id === competitionId)?.current_phase || '—', icon: '🏆', color: 'accent-violet' },
                { label: 'Total Teams', value: '—', icon: '👥', color: 'accent-cyan' },
                { label: 'Active Comp', value: activeCompetitions.length.toString(), icon: '⚡', color: 'accent-amber' },
                { label: 'Score', value: '—', icon: '📊', color: 'accent-pink' },
              ]
            : [
                { label: 'My Score', value: myScore?.points?.toString() || '0', icon: '⚡', color: 'accent-violet' },
                { label: 'Current Phase', value: allCompetitions.find((c) => c.id === competitionId)?.current_phase || '—', icon: '🏆', color: 'accent-cyan' },
                { label: 'Competitions', value: allCompetitions.length.toString(), icon: '📋', color: 'accent-amber' },
                { label: 'Active', value: activeCompetitions.length.toString(), icon: '🎯', color: 'accent-pink' },
              ]
          ).map((card) => (
            <div key={card.label} className="bg-navy/40 border border-navy-border/40 rounded-xl p-5 hover:border-navy-border/60 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-muted tracking-wider uppercase">{card.label}</span>
                <span className="text-lg">{card.icon}</span>
              </div>
              <p className="text-2xl font-bold text-frost truncate capitalize" style={{ fontFamily: 'var(--font-display)' }}>{card.value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-frost tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up">
            {quickActions.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="bg-navy/40 border border-navy-border/40 rounded-xl p-5 hover:border-accent-violet/20 hover:bg-navy-light/20 transition-all duration-300 group"
              >
                <div className="w-10 h-10 bg-accent-violet/10 border border-accent-violet/20 rounded-lg flex items-center justify-center mb-3 group-hover:bg-accent-violet/15 transition-colors">
                  <svg className="w-5 h-5 text-accent-violet" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={action.icon} />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-frost mb-1">{action.label}</h3>
                <p className="text-xs text-muted">{action.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {announcements && announcements.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-frost tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Recent Announcements
            </h2>
            <div className="space-y-3 animate-fade-in-up">
              {announcements.map((a) => (
                <div key={a.id} className="bg-navy/40 border border-navy-border/40 rounded-xl p-5 hover:border-navy-border/60 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-frost">{a.title}</h3>
                        {a.priority > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-violet/10 text-accent-violet border border-accent-violet/20">
                            priority {a.priority}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted line-clamp-2">{a.message}</p>
                    </div>
                    <span className="text-xs text-muted whitespace-nowrap">
                      {new Date(a.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {allCompetitions.length === 0 && !compLoading && (
          <div className="bg-navy/30 border border-navy-border/30 rounded-2xl p-10 text-center animate-fade-in-up">
            <div className="w-16 h-16 bg-navy-light/30 border border-navy-border/40 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-frost mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              No Active Competition
            </h3>
            <p className="text-sm text-muted/70 max-w-md mx-auto leading-relaxed">
              {isAdmin
                ? 'Create a competition to begin the hackathon.'
                : 'Join a team or wait for an admin to start a competition.'}
            </p>
          </div>
        )}
      </div>
    </Layout>
  )
}
