import { useState } from 'react'
import Layout from '../components/Layout'
import { useFetch } from '../lib/hooks'
import { useAuth } from '../context/AuthContext'
import type { Competition, Leaderboard, LeaderboardEntry } from '../lib/types'

export default function LeaderboardPage() {
  useAuth()
  const { data: competitions, loading: compsLoading } = useFetch<Competition[]>('/competitions/')
  const [selectedCompId, setSelectedCompId] = useState<number | null>(null)
  const compId = selectedCompId ?? competitions?.[0]?.id ?? null

  const { data: leaderboard, loading: lbLoading, error: lbError } = useFetch<Leaderboard>(
    compId ? `/scores/leaderboard/${compId}` : null,
    [compId]
  )

  const myTeamEntryActual = leaderboard?.entries?.find((e) => {
    const storedTeamId = localStorage.getItem('my_team_id')
    return storedTeamId && e.team_id === Number(storedTeamId)
  })

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Leaderboard
          </h1>
          <p className="text-sm text-silver-dim mt-1">Live competition rankings</p>
        </div>

        {compsLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-cyan/20 border-t-cyan rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {compsLoading === false && competitions && competitions.length > 0 && (
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

            {lbLoading && (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-cyan/20 border-t-cyan rounded-full animate-spin" />
              </div>
            )}

            {lbError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400 animate-fade-in-up">
                {lbError}
              </div>
            )}

            {!lbLoading && !lbError && leaderboard && leaderboard.entries.length === 0 && (
              <div className="text-center py-20 animate-fade-in-up">
                <div className="w-16 h-16 bg-midnight-light/30 border border-midnight-lighter/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-silver-dim/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-silver-dim text-sm">No scores yet. Rankings will appear once rounds are scored.</p>
              </div>
            )}

            {!lbLoading && !lbError && leaderboard && leaderboard.entries.length > 0 && (
              <div className="animate-fade-in-up delay-2">
                <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-midnight-lighter/40">
                          <th className="text-left px-5 py-3 text-[11px] font-medium text-silver-dim tracking-wider uppercase">Rank</th>
                          <th className="text-left px-5 py-3 text-[11px] font-medium text-silver-dim tracking-wider uppercase">Team</th>
                          <th className="text-right px-5 py-3 text-[11px] font-medium text-silver-dim tracking-wider uppercase">Total</th>
                          <th className="text-right px-5 py-3 text-[11px] font-medium text-silver-dim tracking-wider uppercase">Quiz</th>
                          <th className="text-right px-5 py-3 text-[11px] font-medium text-silver-dim tracking-wider uppercase">Debug</th>
                          <th className="text-right px-5 py-3 text-[11px] font-medium text-silver-dim tracking-wider uppercase">Ideathon</th>
                          <th className="text-right px-5 py-3 text-[11px] font-medium text-silver-dim tracking-wider uppercase">Bonus</th>
                          <th className="text-right px-5 py-3 text-[11px] font-medium text-silver-dim tracking-wider uppercase">Members</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.entries.map((entry, i) => {
                          const isHighlighted = myTeamEntryActual?.team_id === entry.team_id
                          return (
                            <LeaderboardRow
                              key={entry.team_id}
                              entry={entry}
                              index={i}
                              isHighlighted={isHighlighted}
                            />
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}

function LeaderboardRow({ entry, index, isHighlighted }: { entry: LeaderboardEntry; index: number; isHighlighted: boolean }) {
  const rankDisplay = () => {
    if (entry.rank <= 3) {
      const medals = ['🥇', '🥈', '🥉']
      return <span className="text-lg">{medals[entry.rank - 1]}</span>
    }
    return <span className="text-silver-dim font-medium">#{entry.rank}</span>
  }

  return (
    <tr
      className={`border-b border-midnight-lighter/20 transition-colors ${
        isHighlighted
          ? 'bg-cyan/5 hover:bg-cyan/8'
          : 'hover:bg-midnight-light/20'
      }`}
      style={{ animationDelay: `${(index + 3) * 0.03}s` }}
    >
      <td className="px-5 py-3.5">
        <div className="w-8 flex items-center">{rankDisplay()}</div>
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className={`font-medium ${isHighlighted ? 'text-cyan' : 'text-white'}`}>
            {entry.team_name}
          </span>
          {isHighlighted && (
            <span className="inline-flex px-1.5 py-0.5 text-[9px] font-medium bg-cyan/10 text-cyan border border-cyan/30 rounded">
              YOU
            </span>
          )}
        </div>
      </td>
      <td className="px-5 py-3.5 text-right">
        <span className="font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
          {entry.total_score}
        </span>
      </td>
      <td className="px-5 py-3.5 text-right text-silver">{entry.quiz_score}</td>
      <td className="px-5 py-3.5 text-right text-silver">{entry.debugging_score}</td>
      <td className="px-5 py-3.5 text-right text-silver">{entry.ideathon_score}</td>
      <td className="px-5 py-3.5 text-right text-silver">{entry.bonus_score}</td>
      <td className="px-5 py-3.5 text-right text-silver-dim">{entry.member_count}</td>
    </tr>
  )
}
