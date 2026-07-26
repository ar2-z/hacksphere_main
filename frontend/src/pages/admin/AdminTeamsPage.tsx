import { useState } from 'react'
import Layout from '../../components/Layout'
import { useFetch } from '../../lib/hooks'
import type { Competition, Team } from '../../lib/types'

export default function AdminTeamsPage() {
  const [competitionId, setCompetitionId] = useState<string>('')
  const { data: competitions } = useFetch<Competition[]>('/competitions/')
  const { data: teams, loading } = useFetch<Team[]>(
    competitionId ? `/teams/competition/${competitionId}` : null,
    [competitionId]
  )
  const [expandedTeam, setExpandedTeam] = useState<number | null>(null)

  const toggleExpand = (teamId: number) => {
    setExpandedTeam((prev) => (prev === teamId ? null : teamId))
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Teams Management
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <label className="text-sm text-silver-dim">Select Competition</label>
          <select
            value={competitionId}
            onChange={(e) => setCompetitionId(e.target.value)}
            className="bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver focus:outline-none focus:border-cyan/30 input-glow appearance-none"
          >
            <option value="">Choose a competition</option>
            {competitions?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {teams && (
            <span className="text-sm text-silver-dim">{teams.length} team{teams.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {!competitionId ? (
          <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-12 text-center animate-fade-in-up">
            <div className="w-16 h-16 bg-midnight-light/30 border border-midnight-lighter/40 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-silver-dim/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              Select a Competition
            </h3>
            <p className="text-sm text-silver-dim/70 max-w-md mx-auto">
              Choose a competition above to view and manage participating teams.
            </p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-cyan/30 border-t-cyan rounded-full" />
          </div>
        ) : teams && teams.length > 0 ? (
          <div className="animate-fade-in-up">
            <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-midnight-lighter/30">
                    <th className="text-left px-5 py-3.5 text-silver-dim text-xs uppercase tracking-wider font-medium">Team</th>
                    <th className="text-left px-5 py-3.5 text-silver-dim text-xs uppercase tracking-wider font-medium">Code</th>
                    <th className="text-left px-5 py-3.5 text-silver-dim text-xs uppercase tracking-wider font-medium">Members</th>
                    <th className="text-left px-5 py-3.5 text-silver-dim text-xs uppercase tracking-wider font-medium">Ready</th>
                    <th className="text-left px-5 py-3.5 text-silver-dim text-xs uppercase tracking-wider font-medium">Created</th>
                    <th className="px-5 py-3.5 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((team) => (
                    <>
                      <tr
                        key={team.id}
                        className="border-b border-midnight-lighter/20 hover:bg-midnight-light/20 transition-colors cursor-pointer"
                        onClick={() => toggleExpand(team.id)}
                      >
                        <td className="px-5 py-4">
                          <span className="font-medium text-white">{team.name}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-mono text-xs text-cyan bg-cyan/10 px-2 py-0.5 rounded border border-cyan/20">
                            {team.team_code}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-silver">
                            {team.member_count} / {team.max_members}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {team.is_ready ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Ready
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-silver/10 text-silver-dim border border-silver/10">
                              Not Ready
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-silver-dim text-xs">
                          {new Date(team.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4">
                          <svg
                            className={`w-4 h-4 text-silver-dim transition-transform ${expandedTeam === team.id ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                          </svg>
                        </td>
                      </tr>
                      {expandedTeam === team.id && (
                        <tr key={`${team.id}-members`} className="border-b border-midnight-lighter/20">
                          <td colSpan={6} className="px-5 py-4 bg-deep-black/30">
                            <div className="space-y-2">
                              <p className="text-xs text-silver-dim uppercase tracking-wider font-medium mb-3">
                                Team Members ({team.members?.length ?? 0})
                              </p>
                              {team.members && team.members.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {team.members.map((member) => (
                                    <div
                                      key={member.id}
                                      className="flex items-center gap-3 p-3 bg-midnight/30 border border-midnight-lighter/20 rounded-lg"
                                    >
                                      <div className="w-8 h-8 bg-midnight-light/60 border border-midnight-lighter/60 rounded-full flex items-center justify-center shrink-0">
                                        <span className="text-xs font-medium text-cyan/70">
                                          {member.user_name?.charAt(0)?.toUpperCase() || '?'}
                                        </span>
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-sm text-white font-medium truncate">{member.user_name}</p>
                                        <p className="text-xs text-silver-dim truncate">{member.user_email}</p>
                                      </div>
                                      <span className="ml-auto text-[10px] text-silver-dim uppercase tracking-wider shrink-0">
                                        {member.role}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-silver-dim">No members</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-12 text-center">
            <span className="text-4xl block mb-3">👥</span>
            <p className="text-silver-dim">No teams registered for this competition yet</p>
          </div>
        )}
      </div>
    </Layout>
  )
}
