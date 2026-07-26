import { useState } from 'react'
import Layout from '../components/Layout'
import { useFetch } from '../lib/hooks'
import api from '../lib/api'
import type { Competition } from '../lib/types'

const STATUS_TABS = ['All', 'Registration', 'Active', 'Completed'] as const
type StatusTab = (typeof STATUS_TABS)[number]

const statusConfig: Record<string, { label: string; color: string }> = {
  registration: { label: 'Registration', color: 'bg-green-500/10 text-green-400 border-green-500/30' },
  active: { label: 'Active', color: 'bg-cyan/10 text-cyan border-cyan/30' },
  completed: { label: 'Completed', color: 'bg-silver-dim/10 text-silver-dim border-silver-dim/30' },
  draft: { label: 'Draft', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return 'TBD'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function CompetitionsPage() {
  const { data: competitions, loading, error } = useFetch<Competition[]>('/competitions/')
  const [activeTab, setActiveTab] = useState<StatusTab>('All')
  const [joinModal, setJoinModal] = useState<{ open: boolean; competitionId: number | null; competitionName: string }>({
    open: false,
    competitionId: null,
    competitionName: '',
  })
  const [joinMode, setJoinMode] = useState<'create' | 'join'>('create')
  const [teamName, setTeamName] = useState('')
  const [teamDesc, setTeamDesc] = useState('')
  const [teamCode, setTeamCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joinSuccess, setJoinSuccess] = useState(false)

  const filtered = competitions?.filter((c) => {
    if (activeTab === 'All') return true
    return c.status === activeTab.toLowerCase()
  }) ?? []

  const openJoinModal = (comp: Competition) => {
    setJoinModal({ open: true, competitionId: comp.id, competitionName: comp.name })
    setJoinMode('create')
    setTeamName('')
    setTeamDesc('')
    setTeamCode('')
    setJoinError(null)
    setJoinSuccess(false)
  }

  const closeJoinModal = () => {
    setJoinModal({ open: false, competitionId: null, competitionName: '' })
    setJoinError(null)
    setJoinSuccess(false)
  }

  const handleJoin = async () => {
    setJoinError(null)
    setSubmitting(true)
    try {
      if (joinMode === 'create') {
        if (!teamName.trim()) {
          setJoinError('Team name is required')
          setSubmitting(false)
          return
        }
        await api.post('/teams/', {
          name: teamName.trim(),
          description: teamDesc.trim() || null,
          competition_id: joinModal.competitionId,
        })
      } else {
        if (!teamCode.trim()) {
          setJoinError('Team code is required')
          setSubmitting(false)
          return
        }
        await api.post('/teams/join', { team_code: teamCode.trim() })
      }
      setJoinSuccess(true)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to join competition'
      setJoinError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Competitions
          </h1>
          <p className="text-sm text-silver-dim mt-1">Browse and join hackathon competitions</p>
        </div>

        <div className="flex items-center gap-1 mb-6 p-1 bg-midnight/40 border border-midnight-lighter/40 rounded-lg w-fit animate-fade-in-up delay-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all cursor-pointer ${
                activeTab === tab
                  ? 'bg-cyan/10 text-cyan border border-cyan/30'
                  : 'text-silver-dim hover:text-silver hover:bg-midnight-light/30 border border-transparent'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-cyan/20 border-t-cyan rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400 animate-fade-in-up">
            {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-20 animate-fade-in-up">
            <div className="w-16 h-16 bg-midnight-light/30 border border-midnight-lighter/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-silver-dim/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <p className="text-silver-dim text-sm">No competitions found</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((comp, i) => {
            const sc = statusConfig[comp.status] ?? { label: comp.status, color: 'bg-midnight-light/10 text-silver-dim border-midnight-lighter/30' }
            return (
              <div
                key={comp.id}
                className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-5 hover:border-midnight-lighter/60 transition-all duration-300 animate-fade-in-up"
                style={{ animationDelay: `${(i + 2) * 0.05}s` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                    {comp.name}
                  </h3>
                  <span className={`inline-flex px-2.5 py-0.5 text-[11px] font-medium rounded-full border ${sc.color}`}>
                    {sc.label}
                  </span>
                </div>

                {comp.description && (
                  <p className="text-sm text-silver-dim leading-relaxed mb-3 line-clamp-2">{comp.description}</p>
                )}

                {comp.theme && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-cyan/5 border border-cyan/15 rounded-md text-xs text-cyan/80 mb-3">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                    {comp.theme}
                  </div>
                )}

                <div className="flex items-center gap-4 text-xs text-silver-dim mb-4">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Max {comp.max_teams} teams
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Teams {comp.team_min_size}–{comp.team_max_size}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-silver-dim/70 mb-4">
                  <span>Reg: {formatDate(comp.registration_start)} – {formatDate(comp.registration_end)}</span>
                </div>

                <div className="flex items-center gap-4 text-xs text-silver-dim/70 mb-4">
                  <span>Event: {formatDate(comp.event_start)} – {formatDate(comp.event_end)}</span>
                </div>

                {comp.status === 'registration' && (
                  <button
                    onClick={() => openJoinModal(comp)}
                    className="bg-cyan/10 hover:bg-cyan/20 text-cyan border border-cyan/30 rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer"
                  >
                    Join Competition
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {joinModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={closeJoinModal}>
            <div
              className="bg-midnight/90 border border-midnight-lighter/50 rounded-2xl p-6 w-full max-w-md mx-4 animate-fade-in-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                  {joinSuccess ? 'Joined!' : `Join ${joinModal.competitionName}`}
                </h2>
                <button onClick={closeJoinModal} className="text-silver-dim hover:text-silver transition-colors cursor-pointer">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {joinSuccess ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-silver mb-4">
                    {joinMode === 'create' ? 'Your team has been created!' : 'You have joined the team!'}
                  </p>
                  <button
                    onClick={closeJoinModal}
                    className="bg-cyan/10 hover:bg-cyan/20 text-cyan border border-cyan/30 rounded-lg px-6 py-2 text-sm font-medium transition-all cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2 mb-5">
                    <button
                      onClick={() => setJoinMode('create')}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-all cursor-pointer ${
                        joinMode === 'create'
                          ? 'bg-cyan/10 text-cyan border-cyan/30'
                          : 'bg-midnight/40 text-silver-dim border-midnight-lighter/40 hover:text-silver'
                      }`}
                    >
                      Create Team
                    </button>
                    <button
                      onClick={() => setJoinMode('join')}
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
                          placeholder="Brief description of your team"
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

                  {joinError && (
                    <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
                      {joinError}
                    </div>
                  )}

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={closeJoinModal}
                      className="flex-1 px-4 py-2.5 text-sm font-medium text-silver-dim hover:text-silver bg-midnight/40 border border-midnight-lighter/40 rounded-lg transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleJoin}
                      disabled={submitting}
                      className="flex-1 bg-cyan/10 hover:bg-cyan/20 text-cyan border border-cyan/30 rounded-lg px-4 py-2.5 text-sm font-medium transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-cyan/20 border-t-cyan rounded-full animate-spin" />
                          {joinMode === 'create' ? 'Creating...' : 'Joining...'}
                        </span>
                      ) : (
                        joinMode === 'create' ? 'Create Team' : 'Join Team'
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
