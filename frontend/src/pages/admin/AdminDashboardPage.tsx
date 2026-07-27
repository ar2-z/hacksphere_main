import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabase'
import { useFetch } from '../../lib/hooks'
import type { Competition, AuditLog } from '../../lib/types'

interface DashboardStats {
  total_teams: number
  total_participants: number
  active_competitions: number
  total_violations: number
}

const statCards: { key: keyof DashboardStats; label: string; color: string }[] = [
  { key: 'total_teams', label: 'Total Teams', color: 'text-accent-violet' },
  { key: 'total_participants', label: 'Total Participants', color: 'text-accent-cyan' },
  { key: 'active_competitions', label: 'Active Competitions', color: 'text-accent-amber' },
  { key: 'total_violations', label: 'Total Violations', color: 'text-accent-pink' },
]

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    total_teams: 0,
    total_participants: 0,
    active_competitions: 0,
    total_violations: 0,
  })
  const [statsLoading, setStatsLoading] = useState(true)

  const { data: auditLogs, loading: logsLoading } = useFetch<AuditLog[]>(
    'audit_logs',
    { order: { column: 'created_at', ascending: false }, limit: 10 }
  )

  const { data: activeCompetitions, loading: compLoading } = useFetch<Competition[]>(
    'competitions',
    { filters: { is_active: true }, order: { column: 'created_at', ascending: false } }
  )

  useEffect(() => {
    const fetchStats = async () => {
      setStatsLoading(true)
      const [teams, participants, active, violations] = await Promise.all([
        supabase.from('teams').select('*', { count: 'exact', head: true }),
        supabase.from('team_members').select('*', { count: 'exact', head: true }),
        supabase.from('competitions').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('violations').select('*', { count: 'exact', head: true }),
      ])
      setStats({
        total_teams: teams.count ?? 0,
        total_participants: participants.count ?? 0,
        active_competitions: active.count ?? 0,
        total_violations: violations.count ?? 0,
      })
      setStatsLoading(false)
    }
    fetchStats()
  }, [])

  return (
    <Layout>
      <div className="space-y-8">
        <h1
          className="text-2xl font-bold text-frost tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Admin Dashboard
        </h1>

        {statsLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-accent-violet/30 border-t-accent-violet rounded-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((card) => (
              <div key={card.key} className="bg-navy/40 border border-navy-border/40 rounded-xl p-5">
                <p className="text-sm text-frost-dim mb-2">{card.label}</p>
                <p
                  className={`text-3xl font-bold ${card.color}`}
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {stats[card.key]}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-4">
          <h2
            className="text-xl font-bold text-frost tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Active Competitions
          </h2>
          {compLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-accent-violet/30 border-t-accent-violet rounded-full" />
            </div>
          ) : activeCompetitions && activeCompetitions.length > 0 ? (
            <div className="space-y-3">
              {activeCompetitions.map((comp) => (
                <div key={comp.id} className="bg-navy/40 border border-navy-border/40 rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <h3 className="text-sm font-semibold text-frost">{comp.name}</h3>
                      <p className="text-xs text-frost-dim capitalize">
                        Phase: {comp.current_phase} &middot; Max Teams: {comp.max_teams} &middot; Max Members: {comp.max_members_per_team}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30">
                      Active
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-navy/40 border border-navy-border/40 rounded-xl p-12 text-center">
              <p className="text-frost-dim">No active competitions</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2
            className="text-xl font-bold text-frost tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Recent Audit Logs
          </h2>
          {logsLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-accent-violet/30 border-t-accent-violet rounded-full" />
            </div>
          ) : auditLogs && auditLogs.length > 0 ? (
            <div className="bg-navy/40 border border-navy-border/40 rounded-xl p-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-frost-dim text-xs uppercase tracking-wider">
                    <th className="text-left py-3 px-4">Action</th>
                    <th className="text-left py-3 px-4">Resource</th>
                    <th className="text-left py-3 px-4">Details</th>
                    <th className="text-left py-3 px-4">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="border-b border-navy-border/20">
                      <td className="py-3 px-4 text-frost font-medium">{log.action}</td>
                      <td className="py-3 px-4 text-frost-dim">
                        {log.resource_type}{log.resource_id ? ` / ${log.resource_id}` : ''}
                      </td>
                      <td className="py-3 px-4 text-frost-dim text-xs max-w-[200px] truncate">
                        {log.details ? JSON.stringify(log.details) : '—'}
                      </td>
                      <td className="py-3 px-4 text-muted text-xs">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-navy/40 border border-navy-border/40 rounded-xl p-12 text-center">
              <p className="text-frost-dim">No audit logs yet</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
