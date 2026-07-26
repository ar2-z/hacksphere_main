import { useState } from 'react'
import Layout from '../components/Layout'
import { useFetch } from '../lib/hooks'
import type { Competition, Clue, ClueDistribution } from '../lib/types'

interface ClueWithDistribution extends Clue {
  distribution?: ClueDistribution
  is_revealed?: boolean
}

interface TeamCluesResponse {
  team_id: number
  team_name: string
  total_clues: number
  revealed_clues: number
  clues: ClueWithDistribution[]
}

const typeConfig: Record<string, { label: string; color: string; icon: string }> = {
  text: { label: 'Text', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30', icon: 'M4 6h16M4 12h16M4 18h7' },
  code: { label: 'Code', color: 'bg-cyan/10 text-cyan border-cyan/30', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
  hint: { label: 'Hint', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
}

export default function CluesPage() {
  const { data: competitions, loading: compsLoading } = useFetch<Competition[]>('/competitions/')
  const [selectedCompId, setSelectedCompId] = useState<number | null>(null)
  const compId = selectedCompId ?? competitions?.[0]?.id ?? null

  const { data: teamCluesRes, loading: cluesLoading, error: cluesError } = useFetch<TeamCluesResponse>(
    compId ? `/clues/my-clues?competition_id=${compId}` : null,
    [compId]
  )
  const clues: ClueWithDistribution[] = teamCluesRes?.clues ?? []

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Clues
          </h1>
          <p className="text-sm text-silver-dim mt-1">Discover clues earned through competition rounds</p>
        </div>

        {compsLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-cyan/20 border-t-cyan rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {competitions && competitions.length > 0 && (
              <div className="mb-6 animate-fade-in-up delay-1">
                <label className="block text-xs text-silver-dim mb-1.5">Competition</label>
                <select
                  value={compId ?? ''}
                  onChange={(e) => setSelectedCompId(Number(e.target.value))}
                  className="bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver focus:outline-none focus:border-cyan/30 input-glow cursor-pointer max-w-sm"
                >
                  {competitions.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {cluesLoading && (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-cyan/20 border-t-cyan rounded-full animate-spin" />
              </div>
            )}

            {cluesError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400 animate-fade-in-up">
                {cluesError}
              </div>
            )}

            {!cluesLoading && !cluesError && clues && clues.length === 0 && (
              <div className="text-center py-20 animate-fade-in-up">
                <div className="w-16 h-16 bg-midnight-light/30 border border-midnight-lighter/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-silver-dim/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <p className="text-silver-dim text-sm">No clues earned yet. Complete rounds to earn clues.</p>
              </div>
            )}

            {!cluesLoading && !cluesError && clues && clues.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {clues.map((clue, i) => (
                  <ClueCard key={clue.id} clue={clue} index={i} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}

function ClueCard({ clue, index }: { clue: ClueWithDistribution; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const tc = typeConfig[clue.clue_type] ?? { label: clue.clue_type, color: 'bg-midnight-light/10 text-silver-dim border-midnight-lighter/30', icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z' }

  const isRevealed = clue.is_revealed ?? true
  const hasContent = clue.content && clue.content.trim().length > 0

  return (
    <div
      className={`bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-5 transition-all duration-300 animate-fade-in-up ${
        isRevealed ? 'hover:border-midnight-lighter/60' : 'opacity-60'
      }`}
      style={{ animationDelay: `${(index + 2) * 0.05}s` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {!isRevealed && (
            <svg className="w-4 h-4 text-silver-dim/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          )}
          <h3 className={`text-sm font-bold tracking-tight ${isRevealed ? 'text-white' : 'text-silver-dim'}`} style={{ fontFamily: 'var(--font-display)' }}>
            {clue.name}
          </h3>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full border ${tc.color}`}>
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tc.icon} />
          </svg>
          {tc.label}
        </span>
      </div>

      <p className={`text-xs leading-relaxed mb-3 ${isRevealed ? 'text-silver-dim' : 'text-silver-dim/50'}`}>
        {isRevealed ? clue.description : 'Complete more rounds to reveal this clue.'}
      </p>

      {isRevealed && hasContent && (
        <>
          {expanded ? (
            <div className="bg-deep-black/60 border border-midnight-lighter/40 rounded-lg p-3 mb-3">
              <pre className="text-xs text-silver whitespace-pre-wrap break-words font-mono">{clue.content}</pre>
            </div>
          ) : (
            <button
              onClick={() => setExpanded(true)}
              className="text-xs text-cyan/70 hover:text-cyan transition-colors cursor-pointer mb-3 flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Reveal content
            </button>
          )}
        </>
      )}

      <div className="flex items-center gap-3 text-[10px] text-silver-dim/60">
        {clue.source_phase && (
          <span className="flex items-center gap-1">
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {clue.source_phase}
            {clue.source_round != null && ` #${clue.source_round}`}
          </span>
        )}
        <span className="flex items-center gap-1">
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Order {clue.order}
        </span>
      </div>
    </div>
  )
}
