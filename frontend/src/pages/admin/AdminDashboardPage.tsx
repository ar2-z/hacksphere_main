import { useState } from 'react'
import Layout from '../../components/Layout'
import { useFetch } from '../../lib/hooks'
import type { Competition } from '../../lib/types'

interface DashboardStats {
  competition_id: number
  competition_name: string
  competition_status: string
  total_teams: number
  total_participants: number
  total_users: number
  total_violations: number
  total_points_awarded: number
  registered_teams: number
  active_teams: number
}

interface Announcement {
  id: number
  title: string
  content: string
  created_at: string
}

const statCards = [
  { key: 'total_teams' as const, label: 'Total Teams', icon: '👥' },
  { key: 'total_participants' as const, label: 'Total Participants', icon: '🎯' },
  { key: 'total_violations' as const, label: 'Violations', icon: '⚠️' },
  { key: 'active_teams' as const, label: 'Active Teams', icon: '✅' },
  { key: 'total_points_awarded' as const, label: 'Points Awarded', icon: '🏆' },
  { key: 'total_users' as const, label: 'Total Users', icon: '📊' },
]

export default function AdminDashboardPage() {
  const [competitionId, setCompetitionId] = useState<string>('')
  const { data: competitions } = useFetch<Competition[]>('/competitions/')
  const { data: stats, loading: statsLoading } = useFetch<DashboardStats>(
    competitionId ? `/admin/dashboard/${competitionId}` : null
  )
  const { data: announcements, loading: announcementsLoading } = useFetch<Announcement[]>(
    competitionId ? `/admin/announcements/${competitionId}` : null
  )

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1
            className="text-2xl font-bold text-white tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Admin Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <label className="text-sm text-silver-dim">Select Competition</label>
          <select
            value={competitionId}
            onChange={(e) => setCompetitionId(e.target.value)}
            className="bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver focus:outline-none focus:border-cyan/30 input-glow"
          >
            <option value="">All Competitions</option>
            {competitions?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {statsLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-cyan/30 border-t-cyan rounded-full" />
          </div>
        ) : stats ? (
          <>
            <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-5 flex items-center gap-4">
              <span className="text-2xl">🏆</span>
              <div>
                <p className="text-sm text-silver-dim">{stats.competition_name}</p>
                <p className="text-xs text-silver-dim/60 capitalize">{stats.competition_status}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in-up">
              {statCards.map((card) => (
                <div
                  key={card.key}
                  className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-5"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{card.icon}</span>
                    <span className="text-sm text-silver-dim">{card.label}</span>
                  </div>
                  <p
                    className="text-3xl font-bold text-white"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {stats[card.key] ?? 0}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-12 text-center">
            <span className="text-4xl block mb-3">📊</span>
            <p className="text-silver-dim">Select a competition to view dashboard stats</p>
          </div>
        )}

        <div className="space-y-4">
          <h2
            className="text-xl font-bold text-white tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Recent Announcements
          </h2>

          {announcementsLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-cyan/30 border-t-cyan rounded-full" />
            </div>
          ) : announcements && announcements.length > 0 ? (
            <div className="space-y-3 animate-fade-in-up">
              {announcements.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <h3 className="text-sm font-semibold text-white">{a.title}</h3>
                      <p className="text-sm text-silver-dim line-clamp-2">{a.content}</p>
                    </div>
                    <span className="text-xs text-silver-dim whitespace-nowrap">
                      {new Date(a.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-12 text-center">
              <span className="text-4xl block mb-3">📢</span>
              <p className="text-silver-dim">No announcements yet</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
