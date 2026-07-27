import Layout from '../components/Layout'
import { useFetch } from '../lib/hooks'
import type { Competition } from '../lib/types'

const phaseConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
  quiz: {
    label: 'Quiz',
    bg: 'bg-accent-cyan/10',
    text: 'text-accent-cyan',
    border: 'border-accent-cyan/30',
  },
  debugging: {
    label: 'Debugging',
    bg: 'bg-accent-violet/10',
    text: 'text-accent-violet',
    border: 'border-accent-violet/30',
  },
  ideathon: {
    label: 'Ideathon',
    bg: 'bg-accent-pink/10',
    text: 'text-accent-pink',
    border: 'border-accent-pink/30',
  },
  clues: {
    label: 'Clues',
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400',
    border: 'border-yellow-500/30',
  },
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return 'TBD'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function CompetitionsPage() {
  const { data: competitions, loading, error } = useFetch<Competition[]>('competitions', {
    order: { column: 'created_at', ascending: false },
  })

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1
            className="text-2xl font-bold text-frost tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Competitions
          </h1>
          <p className="text-sm text-frost-dim mt-1">Browse and join hackathon competitions</p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-accent-violet/20 border-t-accent-violet rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && (!competitions || competitions.length === 0) && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-navy-light/30 border border-navy-border/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-7 h-7 text-frost-dim/40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <p className="text-frost-dim text-sm">No competitions found</p>
          </div>
        )}

        {!loading && !error && competitions && competitions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {competitions.map((comp) => {
              const phase = phaseConfig[comp.current_phase] ?? {
                label: comp.current_phase,
                bg: 'bg-navy-light/30',
                text: 'text-frost-dim',
                border: 'border-navy-border/30',
              }

              return (
                <div
                  key={comp.id}
                  className="bg-navy/40 border border-navy-border/40 rounded-xl p-5 hover:border-accent-violet/20 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3
                      className="text-lg font-bold text-frost tracking-tight"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {comp.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex px-2.5 py-0.5 text-[11px] font-medium rounded-full border ${phase.bg} ${phase.text} ${phase.border}`}
                      >
                        {phase.label}
                      </span>
                      <span
                        className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full border ${
                          comp.is_active
                            ? 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/30'
                            : 'bg-navy-lighter/40 text-muted border-navy-border/30'
                        }`}
                      >
                        {comp.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {comp.description && (
                    <p className="text-sm text-frost-dim leading-relaxed mb-3 line-clamp-2">
                      {comp.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-frost-dim/70 mb-3">
                    <span className="flex items-center gap-1.5">
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      {formatDate(comp.start_date)} - {formatDate(comp.end_date)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-frost-dim/70">
                    <span className="flex items-center gap-1.5">
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      Max {comp.max_teams} teams, {comp.max_members_per_team} per team
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
