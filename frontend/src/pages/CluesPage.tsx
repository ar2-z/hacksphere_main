import { useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { useFetch, useRealtime } from '../lib/hooks'
import type { Competition, Clue, TeamClue } from '../lib/types'

const typeConfig: Record<string, { label: string; color: string }> = {
  question: { label: 'Question', color: 'bg-accent-violet/10 text-accent-violet border-accent-violet/20' },
  code_review: { label: 'Code Review', color: 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20' },
  bug_fix: { label: 'Bug Fix', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  architecture: { label: 'Architecture', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  presentation: { label: 'Presentation', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
}

export default function CluesPage() {
  const { user } = useAuth()
  const [teamId, setTeamId] = useState<string | null>(null)
  const [compId, setCompId] = useState<string | null>(null)

  const { data: competitions, loading: compsLoading } = useFetch<Competition[]>('competitions', {
    filters: { is_active: true },
  })

  const activeComp = competitions?.find((c) => c.id === compId) ?? competitions?.[0]

  const { data: teamData, loading: teamLoading } = useFetch<{ id: string }[]>(
    'team_members',
    user?.id ? { filters: { user_id: user.id }, columns: 'id,team_id' } : undefined,
    [user?.id]
  )

  const resolvedTeamId = teamId ?? teamData?.[0]?.team_id ?? null

  const { data: teamClues, loading: cluesLoading, error: cluesError, refetch } = useFetch<TeamClue[]>(
    resolvedTeamId && activeComp?.id
      ? 'team_clues'
      : null,
    resolvedTeamId && activeComp?.id
      ? {
          filters: { team_id: resolvedTeamId },
          columns: '*, clue:clues(*)',
        }
      : undefined,
    [resolvedTeamId, activeComp?.id]
  )

  useRealtime<TeamClue>('team_clues', {
    event: 'INSERT',
  }, () => {
    refetch()
  })

  useRealtime<TeamClue>('team_clues', {
    event: 'UPDATE',
  }, () => {
    refetch()
  })

  const loading = compsLoading || teamLoading || cluesLoading

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-2xl font-bold text-frost tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Clues
          </h1>
          <p className="text-sm text-muted mt-1">Discover clues earned through competition rounds</p>
        </div>

        <div className="flex items-center gap-4 mb-6 animate-fade-in-up delay-1">
          {competitions && competitions.length > 0 && (
            <div className="flex-1 max-w-sm">
              <label className="block text-xs text-muted mb-1.5">Competition</label>
              <select
                value={activeComp?.id ?? ''}
                onChange={(e) => setCompId(e.target.value)}
                className="w-full bg-void/60 border border-navy-lighter/60 rounded-lg px-4 py-2.5 text-sm text-frost focus:outline-none focus:border-accent-violet/30 input-glow appearance-none cursor-pointer"
              >
                {competitions.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-accent-cyan/20 border-t-accent-cyan rounded-full animate-spin" />
          </div>
        )}

        {cluesError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400 animate-fade-in-up">
            {cluesError}
          </div>
        )}

        {!loading && !cluesError && teamClues && teamClues.length === 0 && (
          <div className="text-center py-20 animate-fade-in-up">
            <div className="w-16 h-16 bg-navy-light/30 border border-navy-border/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <p className="text-muted text-sm">No clues earned yet. Complete rounds to earn clues.</p>
          </div>
        )}

        {!loading && !cluesError && teamClues && teamClues.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teamClues.map((tc, i) => (
              <ClueCard key={tc.id} teamClue={tc} index={i} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

function ClueCard({ teamClue, index }: { teamClue: TeamClue; index: number }) {
  const clue = teamClue.clue
  const unlocked = teamClue.is_unlocked

  if (!clue) return null

  const tc = typeConfig[clue.clue_type] ?? { label: clue.clue_type, color: 'bg-navy-light/10 text-muted border-navy-border/30' }

  return (
    <div
      className={`bg-navy/40 border border-navy-border/40 rounded-xl p-5 transition-all duration-300 animate-fade-in-up ${
        unlocked ? 'hover:border-navy-border/60' : 'opacity-60'
      }`}
      style={{ animationDelay: `${(index + 2) * 0.05}s` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {!unlocked && (
            <svg className="w-4 h-4 text-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          )}
          <h3
            className={`text-sm font-bold tracking-tight ${unlocked ? 'text-frost' : 'text-muted'}`}
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {clue.title}
          </h3>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full border ${tc.color}`}>
          {tc.label}
        </span>
      </div>

      {unlocked ? (
        <p className="text-xs text-muted leading-relaxed mb-3">{clue.content}</p>
      ) : (
        <p className="text-xs text-muted/50 leading-relaxed mb-3">Complete more rounds to reveal this clue.</p>
      )}

      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-navy-light/30 border border-navy-border/30 text-muted">
          {clue.phase}
        </span>
        <span className="text-xs text-accent-violet font-semibold">{clue.points_value} pts</span>
      </div>

      {unlocked && teamClue.unlocked_at && (
        <p className="text-[10px] text-muted/50 mt-2">
          Unlocked {new Date(teamClue.unlocked_at).toLocaleDateString()}
        </p>
      )}
    </div>
  )
}
