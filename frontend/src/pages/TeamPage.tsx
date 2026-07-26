import { useState } from 'react'
import Layout from '../components/Layout'
import { useFetch } from '../lib/hooks'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import type { Competition, Team } from '../lib/types'

const roleLabels: Record<string, string> = {
  leader: 'Leader',
  member: 'Member',
}

export default function TeamPage() {
  const { user } = useAuth()
  const { data: competitions, loading: compsLoading } = useFetch<Competition[]>('/competitions/')
  const activeComps = competitions?.filter((c) => c.status === 'active' || c.status === 'registration') ?? []
  const [selectedCompId, setSelectedCompId] = useState<number | null>(null)
  const compId = selectedCompId ?? activeComps[0]?.id ?? null

  const { data: teams, loading: teamsLoading, refetch } = useFetch<Team[]>(
    compId ? `/teams/competition/${compId}` : null,
    [compId]
  )

  const myTeam = teams?.find((t) => t.members?.some((m) => m.user_id === user?.id)) ?? null
  const loading = compsLoading || teamsLoading

  const [copied, setCopied] = useState(false)
  const [togglingReady, setTogglingReady] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [showCreateJoin, setShowCreateJoin] = useState(false)
  const [joinMode, setJoinMode] = useState<'create' | 'join'>('create')
  const [teamName, setTeamName] = useState('')
  const [teamDesc, setTeamDesc] = useState('')
  const [teamCode, setTeamCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState(false)

  const copyCode = async () => {
    if (!myTeam) return
    await navigator.clipboard.writeText(myTeam.team_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const toggleReady = async () => {
    if (!myTeam || togglingReady) return
    setTogglingReady(true)
    try {
      await api.post(`/teams/${myTeam.id}/ready`)
      refetch()
    } catch {
    } finally {
      setTogglingReady(false)
    }
  }

  const leaveTeam = async () => {
    if (!myTeam || leaving) return
    if (!window.confirm('Are you sure you want to leave this team?')) return
    setLeaving(true)
    try {
      await api.post(`/teams/${myTeam.id}/leave`)
      refetch()
    } catch {
    } finally {
      setLeaving(false)
    }
  }

  const handleCreateJoin = async () => {
    setFormError(null)
    setSubmitting(true)
    try {
      if (joinMode === 'create') {
        if (!teamName.trim()) { setFormError('Team name is required'); setSubmitting(false); return }
        if (!compId) { setFormError('No competition selected'); setSubmitting(false); return }
        await api.post('/teams/', {
          name: teamName.trim(),
          description: teamDesc.trim() || null,
          competition_id: compId,
        })
      } else {
        if (!teamCode.trim()) { setFormError('Team code is required'); setSubmitting(false); return }
        await api.post('/teams/join', { team_code: teamCode.trim() })
      }
      setFormSuccess(true)
      setTimeout(() => {
        refetch()
        setShowCreateJoin(false)
        setFormSuccess(false)
        setTeamName('')
        setTeamDesc('')
        setTeamCode('')
      }, 1200)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Operation failed'
      setFormError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            My Team
          </h1>
          <p className="text-sm text-silver-dim mt-1">Manage your team for active competitions</p>
        </div>

        {activeComps.length > 0 && (
          <div className="mb-6 animate-fade-in-up delay-1">
            <label className="block text-xs text-silver-dim mb-1.5">Competition</label>
            <select
              value={compId ?? ''}
              onChange={(e) => setSelectedCompId(Number(e.target.value))}
              className="bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver focus:outline-none focus:border-cyan/30 input-glow cursor-pointer max-w-sm"
            >
              {activeComps.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-cyan/20 border-t-cyan rounded-full animate-spin" />
          </div>
        )}

        {!loading && activeComps.length === 0 && (
          <div className="text-center py-20 animate-fade-in-up">
            <div className="w-16 h-16 bg-midnight-light/30 border border-midnight-lighter/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-silver-dim/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-silver-dim text-sm">No active competitions. Check back later.</p>
          </div>
        )}

        {!loading && compId && !myTeam && (
          <div className="animate-fade-in-up">
            <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-8 text-center">
              <div className="w-14 h-14 bg-midnight-light/30 border border-midnight-lighter/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-silver-dim/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                No Team Yet
              </h3>
              <p className="text-sm text-silver-dim/70 max-w-sm mx-auto mb-5">
                Create a new team or join an existing one with a team code.
              </p>
              <button
                onClick={() => {
                  setShowCreateJoin(true)
                  setJoinMode('create')
                  setTeamName('')
                  setTeamDesc('')
                  setTeamCode('')
                  setFormError(null)
                  setFormSuccess(false)
                }}
                className="bg-cyan/10 hover:bg-cyan/20 text-cyan border border-cyan/30 rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer"
              >
                Create or Join Team
              </button>
            </div>
          </div>
        )}

        {!loading && myTeam && (
          <div className="space-y-5 animate-fade-in-up delay-1">
            <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                    {myTeam.name}
                  </h2>
                  {myTeam.description && (
                    <p className="text-sm text-silver-dim mt-1">{myTeam.description}</p>
                  )}
                </div>
                <div className={`px-2.5 py-1 text-[11px] font-medium rounded-full border ${
                  myTeam.is_ready
                    ? 'bg-green-500/10 text-green-400 border-green-500/30'
                    : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                }`}>
                  {myTeam.is_ready ? 'Ready' : 'Not Ready'}
                </div>
              </div>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver font-mono">
                  {myTeam.team_code}
                </div>
                <button
                  onClick={copyCode}
                  className="bg-midnight/40 hover:bg-midnight-light/40 text-silver-dim hover:text-silver border border-midnight-lighter/40 rounded-lg px-3 py-2.5 text-sm transition-all cursor-pointer"
                >
                  {copied ? (
                    <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  )}
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={toggleReady}
                  disabled={togglingReady}
                  className="bg-cyan/10 hover:bg-cyan/20 text-cyan border border-cyan/30 rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {togglingReady ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-cyan/20 border-t-cyan rounded-full animate-spin" />
                      Updating...
                    </span>
                  ) : myTeam.is_ready ? 'Mark Not Ready' : 'Mark Ready'}
                </button>
                <button
                  onClick={leaveTeam}
                  disabled={leaving}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {leaving ? 'Leaving...' : 'Leave Team'}
                </button>
              </div>
            </div>

            <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                Members ({myTeam.members?.length ?? 0}/{myTeam.max_members})
              </h3>
              <div className="space-y-2">
                {myTeam.members?.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 bg-deep-black/30 border border-midnight-lighter/30 rounded-lg px-4 py-3">
                    <div className="w-8 h-8 bg-midnight-light/60 border border-midnight-lighter/60 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-sm font-medium text-cyan/70">
                        {m.user_name?.charAt(0)?.toUpperCase() ?? '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{m.user_name}</p>
                      <p className="text-xs text-silver-dim truncate">{m.user_email}</p>
                    </div>
                    <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full border ${
                      m.role === 'leader'
                        ? 'bg-cyan/10 text-cyan border-cyan/30'
                        : 'bg-midnight-light/30 text-silver-dim border-midnight-lighter/30'
                    }`}>
                      {roleLabels[m.role] ?? m.role}
                    </span>
                  </div>
                ))}
                {(!myTeam.members || myTeam.members.length === 0) && (
                  <p className="text-sm text-silver-dim text-center py-4">No members</p>
                )}
              </div>
            </div>
          </div>
        )}

        {showCreateJoin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => { if (!submitting) setShowCreateJoin(false) }}>
            <div
              className="bg-midnight/90 border border-midnight-lighter/50 rounded-2xl p-6 w-full max-w-md mx-4 animate-fade-in-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                  {formSuccess ? 'Done!' : 'Create or Join Team'}
                </h2>
                {!submitting && (
                  <button onClick={() => setShowCreateJoin(false)} className="text-silver-dim hover:text-silver transition-colors cursor-pointer">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {formSuccess ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-silver">Success!</p>
                </div>
              ) : (
                <>
                  <div className="flex gap-2 mb-5">
                    <button
                      onClick={() => { setJoinMode('create'); setFormError(null) }}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-all cursor-pointer ${
                        joinMode === 'create'
                          ? 'bg-cyan/10 text-cyan border-cyan/30'
                          : 'bg-midnight/40 text-silver-dim border-midnight-lighter/40 hover:text-silver'
                      }`}
                    >
                      Create Team
                    </button>
                    <button
                      onClick={() => { setJoinMode('join'); setFormError(null) }}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-all cursor-pointer ${
                        joinMode === 'join'
                          ? 'bg-cyan/10 text-cyan border-cyan/30'
                          : 'bg-midnight/40 text-silver-dim border-midnight-lighter/40 hover:text-silver'
                      }`}
                    >
                      Join with Code
                    </button>
                  </div>

                  {joinMode === 'create' ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs text-silver-dim mb-1.5">Team Name</label>
                        <input
                          type="text"
                          value={teamName}
                          onChange={(e) => setTeamName(e.target.value)}
                          placeholder="Enter team name"
                          className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-silver-dim mb-1.5">Description (optional)</label>
                        <textarea
                          value={teamDesc}
                          onChange={(e) => setTeamDesc(e.target.value)}
                          placeholder="Brief description"
                          rows={3}
                          className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow resize-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs text-silver-dim mb-1.5">Team Code</label>
                      <input
                        type="text"
                        value={teamCode}
                        onChange={(e) => setTeamCode(e.target.value)}
                        placeholder="Enter team code"
                        className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow"
                      />
                    </div>
                  )}

                  {formError && (
                    <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
                      {formError}
                    </div>
                  )}

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowCreateJoin(false)}
                      className="flex-1 px-4 py-2.5 text-sm font-medium text-silver-dim hover:text-silver bg-midnight/40 border border-midnight-lighter/40 rounded-lg transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateJoin}
                      disabled={submitting}
                      className="flex-1 bg-cyan/10 hover:bg-cyan/20 text-cyan border border-cyan/30 rounded-lg px-4 py-2.5 text-sm font-medium transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-cyan/20 border-t-cyan rounded-full animate-spin" />
                          Working...
                        </span>
                      ) : (
                        joinMode === 'create' ? 'Create' : 'Join'
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
