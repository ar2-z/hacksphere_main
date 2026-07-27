import { useState } from 'react'
import Layout from '../components/Layout'
import { useFetch } from '../lib/hooks'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import type { Competition, Team, TeamMember } from '../lib/types'

function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export default function TeamPage() {
  const { user } = useAuth()

  const { data: competitions } = useFetch<Competition[]>('competitions', {
    filters: { is_active: true },
    order: { column: 'created_at', ascending: false },
  })

  const { data: myTeamData, loading: teamLoading, refetch: refetchTeam } = useFetch<Team[]>(
    'teams',
    user
      ? {
          filters: { leader_id: user.id },
          single: false,
        }
      : undefined,
    [user?.id]
  )

  const myTeam = myTeamData?.[0] ?? null

  const { data: members } = useFetch<TeamMember[]>(
    'team_members',
    myTeam
      ? {
          filters: { team_id: myTeam.id },
        }
      : undefined,
    [myTeam?.id]
  )

  const [view, setView] = useState<'none' | 'create' | 'join'>('none')
  const [teamName, setTeamName] = useState('')
  const [selectedCompId, setSelectedCompId] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState(false)
  const [copied, setCopied] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const resetForm = () => {
    setTeamName('')
    setSelectedCompId('')
    setInviteCode('')
    setFormError(null)
    setFormSuccess(false)
  }

  const handleCreate = async () => {
    setFormError(null)
    if (!teamName.trim()) {
      setFormError('Team name is required')
      return
    }
    if (!selectedCompId) {
      setFormError('Select a competition')
      return
    }
    if (!user) return

    setSubmitting(true)
    try {
      const code = generateInviteCode()
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: teamName.trim(),
          competition_id: selectedCompId,
          leader_id: user.id,
          invite_code: code,
          is_eliminated: false,
        })
        .select()
        .single()

      if (teamError) throw teamError

      const { error: memberError } = await supabase.from('team_members').insert({
        team_id: team.id,
        user_id: user.id,
      })

      if (memberError) throw memberError

      setFormSuccess(true)
      setTimeout(() => {
        refetchTeam()
        setView('none')
        resetForm()
      }, 1200)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create team'
      setFormError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleJoin = async () => {
    setFormError(null)
    if (!inviteCode.trim()) {
      setFormError('Invite code is required')
      return
    }
    if (!user) return

    setSubmitting(true)
    try {
      const { data: team, error: findError } = await supabase
        .from('teams')
        .select('*')
        .eq('invite_code', inviteCode.trim().toUpperCase())
        .single()

      if (findError || !team) {
        throw new Error('Invalid invite code')
      }

      const { error: insertError } = await supabase.from('team_members').insert({
        team_id: team.id,
        user_id: user.id,
      })

      if (insertError) throw insertError

      setFormSuccess(true)
      setTimeout(() => {
        refetchTeam()
        setView('none')
        resetForm()
      }, 1200)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to join team'
      setFormError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleLeave = async () => {
    if (!myTeam || !user || leaving) return
    setLeaving(true)
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', myTeam.id)
        .eq('user_id', user.id)

      if (error) throw error

      if (myTeam.leader_id === user.id) {
        await supabase.from('teams').delete().eq('id', myTeam.id)
      }

      refetchTeam()
    } catch {
    } finally {
      setLeaving(false)
    }
  }

  const copyCode = async () => {
    if (!myTeam) return
    await navigator.clipboard.writeText(myTeam.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1
            className="text-2xl font-bold text-frost tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            My Team
          </h1>
          <p className="text-sm text-frost-dim mt-1">Manage your team for active competitions</p>
        </div>

        {teamLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-accent-violet/20 border-t-accent-violet rounded-full animate-spin" />
          </div>
        )}

        {!teamLoading && !myTeam && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <button
              onClick={() => {
                resetForm()
                setView('create')
              }}
              className="bg-navy/40 border border-navy-border/40 rounded-xl p-6 text-left hover:border-accent-violet/20 transition-all duration-300 cursor-pointer group"
            >
              <div className="w-12 h-12 bg-accent-violet/10 border border-accent-violet/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-accent-violet/15 transition-colors">
                <svg
                  className="w-5 h-5 text-accent-violet"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <h3
                className="text-base font-semibold text-frost mb-1"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Create a Team
              </h3>
              <p className="text-sm text-frost-dim/70">
                Start a new team and invite others to join
              </p>
            </button>

            <button
              onClick={() => {
                resetForm()
                setView('join')
              }}
              className="bg-navy/40 border border-navy-border/40 rounded-xl p-6 text-left hover:border-accent-cyan/20 transition-all duration-300 cursor-pointer group"
            >
              <div className="w-12 h-12 bg-accent-cyan/10 border border-accent-cyan/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-accent-cyan/15 transition-colors">
                <svg
                  className="w-5 h-5 text-accent-cyan"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                  />
                </svg>
              </div>
              <h3
                className="text-base font-semibold text-frost mb-1"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Join a Team
              </h3>
              <p className="text-sm text-frost-dim/70">
                Enter an invite code to join an existing team
              </p>
            </button>
          </div>
        )}

        {!teamLoading && myTeam && (
          <div className="space-y-5">
            <div className="bg-navy/40 border border-navy-border/40 rounded-xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2
                    className="text-lg font-bold text-frost tracking-tight"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {myTeam.name}
                  </h2>
                  {myTeam.is_eliminated && (
                    <span className="inline-flex mt-1 px-2 py-0.5 text-[10px] font-medium rounded-full border bg-red-500/10 text-red-400 border-red-500/30">
                      Eliminated
                    </span>
                  )}
                </div>
                {myTeam.presentation_order !== null && (
                  <span className="inline-flex px-2.5 py-0.5 text-[11px] font-medium rounded-full border bg-accent-violet/10 text-accent-violet border-accent-violet/30">
                    Order #{myTeam.presentation_order}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 bg-void/40 border border-navy-border/60 rounded-lg px-4 py-2.5 text-sm text-frost font-mono tracking-wider">
                  {myTeam.invite_code}
                </div>
                <button
                  onClick={copyCode}
                  className="bg-navy-lighter/40 hover:bg-navy-lighter/60 text-frost-dim hover:text-frost border border-navy-border/40 rounded-lg px-3 py-2.5 text-sm transition-all cursor-pointer"
                >
                  {copied ? (
                    <svg
                      className="w-4 h-4 text-accent-cyan"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  )}
                </button>
              </div>

              <button
                onClick={handleLeave}
                disabled={leaving}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {leaving ? 'Leaving...' : 'Leave Team'}
              </button>
            </div>

            <div className="bg-navy/40 border border-navy-border/40 rounded-xl p-5">
              <h3
                className="text-sm font-semibold text-frost mb-4 tracking-tight"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Members ({members?.length ?? 0})
              </h3>
              <div className="space-y-2">
                {members?.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 bg-void/30 border border-navy-border/30 rounded-lg px-4 py-3"
                  >
                    <div className="w-8 h-8 bg-navy-light/60 border border-navy-border/60 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-sm font-medium text-accent-cyan/70">
                        {m.user?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-frost font-medium truncate">
                        {m.user?.full_name ?? 'Unknown'}
                      </p>
                      <p className="text-xs text-frost-dim truncate">{m.user?.email}</p>
                    </div>
                    {m.user_id === myTeam.leader_id && (
                      <span className="inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full border bg-accent-violet/10 text-accent-violet border-accent-violet/30">
                        Leader
                      </span>
                    )}
                  </div>
                ))}
                {(!members || members.length === 0) && (
                  <p className="text-sm text-frost-dim text-center py-4">No members</p>
                )}
              </div>
            </div>
          </div>
        )}

        {view !== 'none' && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-void/60 backdrop-blur-sm"
            onClick={() => {
              if (!submitting) {
                setView('none')
                resetForm()
              }
            }}
          >
            <div
              className="bg-navy/90 border border-navy-border/50 rounded-2xl p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h2
                  className="text-lg font-bold text-frost tracking-tight"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {formSuccess ? 'Done!' : view === 'create' ? 'Create a Team' : 'Join a Team'}
                </h2>
                {!submitting && (
                  <button
                    onClick={() => {
                      setView('none')
                      resetForm()
                    }}
                    className="text-frost-dim hover:text-frost transition-colors cursor-pointer"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {formSuccess ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-accent-cyan/10 border border-accent-cyan/30 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg
                      className="w-6 h-6 text-accent-cyan"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-frost">
                    {view === 'create' ? 'Team created successfully!' : 'Joined team successfully!'}
                  </p>
                </div>
              ) : view === 'create' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-frost-dim mb-1.5">Team Name</label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="Enter team name"
                      className="w-full bg-void/60 border border-navy-border/60 rounded-lg px-4 py-2.5 text-sm text-frost placeholder-frost-dim/50 focus:outline-none focus:border-accent-violet/40 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-frost-dim mb-1.5">Competition</label>
                    <select
                      value={selectedCompId}
                      onChange={(e) => setSelectedCompId(e.target.value)}
                      className="w-full bg-void/60 border border-navy-border/60 rounded-lg px-4 py-2.5 text-sm text-frost focus:outline-none focus:border-accent-violet/40 transition-colors cursor-pointer"
                    >
                      <option value="">Select a competition</option>
                      {competitions?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs text-frost-dim mb-1.5">Invite Code</label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="Enter 8-character invite code"
                    maxLength={8}
                    className="w-full bg-void/60 border border-navy-border/60 rounded-lg px-4 py-2.5 text-sm text-frost font-mono tracking-wider placeholder-frost-dim/50 focus:outline-none focus:border-accent-cyan/40 transition-colors"
                  />
                </div>
              )}

              {formError && (
                <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
                  {formError}
                </div>
              )}

              {!formSuccess && (
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setView('none')
                      resetForm()
                    }}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-frost-dim hover:text-frost bg-navy-lighter/40 border border-navy-border/40 rounded-lg transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={view === 'create' ? handleCreate : handleJoin}
                    disabled={submitting}
                    className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      view === 'create'
                        ? 'bg-accent-violet/15 hover:bg-accent-violet/25 text-accent-violet border border-accent-violet/30'
                        : 'bg-accent-cyan/15 hover:bg-accent-cyan/25 text-accent-cyan border border-accent-cyan/30'
                    }`}
                  >
                    {submitting ? (
                      <span className="inline-flex items-center gap-2">
                        <span
                          className={`w-4 h-4 border-2 rounded-full animate-spin ${
                            view === 'create'
                              ? 'border-accent-violet/20 border-t-accent-violet'
                              : 'border-accent-cyan/20 border-t-accent-cyan'
                          }`}
                        />
                        Working...
                      </span>
                    ) : view === 'create' ? (
                      'Create Team'
                    ) : (
                      'Join Team'
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
