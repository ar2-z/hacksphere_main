import { useState, useEffect, useCallback } from 'react'
import Layout from '../components/Layout'
import api from '../lib/api'
import type { Competition, DebugChallenge, DebugTestCase, DebugSubmission, LeaderboardEntry } from '../lib/types'
import { useFetch } from '../lib/hooks'

const difficultyColor: Record<string, string> = {
  easy: 'bg-green-500/10 text-green-400 border-green-500/20',
  medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  hard: 'bg-red-500/10 text-red-400 border-red-500/20',
}

const statusDot: Record<string, string> = {
  upcoming: 'bg-silver-dim',
  active: 'bg-green-400 animate-pulse',
  in_progress: 'bg-cyan animate-pulse',
  completed: 'bg-silver-dim/50',
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin h-8 w-8 border-2 border-cyan/30 border-t-cyan rounded-full" />
    </div>
  )
}

function EmptyState({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-midnight/30 border border-midnight-lighter/30 rounded-2xl p-10 text-center">
      <div className="w-16 h-16 bg-midnight-light/30 border border-midnight-lighter/40 rounded-2xl flex items-center justify-center mx-auto mb-5">
        <span className="text-2xl">{icon}</span>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>{title}</h3>
      <p className="text-sm text-silver-dim/70 max-w-md mx-auto leading-relaxed">{desc}</p>
    </div>
  )
}

interface ChallengeDetails {
  challenge: DebugChallenge
  test_cases: DebugTestCase[]
}

export default function DebugPage() {
  const [selectedCompetition, setSelectedCompetition] = useState<number | null>(null)
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [competitionsLoading, setCompetitionsLoading] = useState(true)
  const [activeChallenge, setActiveChallenge] = useState<number | null>(null)

  useEffect(() => {
    api.get('/competitions').then((res) => {
      const data = res.data
      setCompetitions(Array.isArray(data) ? data : data.data ?? [])
    }).catch(() => {}).finally(() => setCompetitionsLoading(false))
  }, [])

  const competitionId = selectedCompetition ?? competitions[0]?.id ?? null
  const { data: challenges, loading: challengesLoading } = useFetch<DebugChallenge[]>(
    competitionId ? `/debugging/challenges?competition_id=${competitionId}` : null,
    [competitionId]
  )

  if (activeChallenge !== null) {
    return (
      <Layout>
        <ChallengeInterface challengeId={activeChallenge} onBack={() => setActiveChallenge(null)} />
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto animate-fade-in-up">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Debugging Arena
            </h1>
            <p className="text-sm text-silver-dim mt-1">Find and fix bugs under pressure</p>
          </div>
          {competitions.length > 0 && (
            <select
              value={competitionId ?? ''}
              onChange={(e) => setSelectedCompetition(Number(e.target.value))}
              className="bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver focus:outline-none focus:border-cyan/30 input-glow"
            >
              {competitions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>

        {!competitionsLoading && competitions.length === 0 ? (
          <EmptyState icon="🏆" title="No Competitions" desc="No competitions are available yet." />
        ) : challengesLoading ? (
          <Spinner />
        ) : !challenges || challenges.length === 0 ? (
          <EmptyState icon="🐛" title="No Challenges" desc="No debugging challenges have been created for this competition yet." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {challenges.map((ch, i) => (
              <div
                key={ch.id}
                className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-5 hover:border-midnight-lighter/60 transition-all duration-300 animate-fade-in-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-silver-dim tracking-wider uppercase">Round {ch.round_number}</span>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border ${difficultyColor[ch.difficulty] ?? 'bg-silver/10 text-silver border-silver/20'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusDot[ch.status] ?? 'bg-silver-dim'}`} />
                    {ch.difficulty}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>{ch.name}</h3>
                <p className="text-xs text-silver-dim mb-4 line-clamp-2">{ch.description}</p>
                <div className="flex items-center gap-4 text-xs text-silver-dim mb-4">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                    {ch.test_case_count} tests
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {ch.time_limit_seconds}s
                  </span>
                  <span className="text-cyan font-medium">{ch.points} pts</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${ch.status === 'completed' ? 'text-silver-dim' : ch.status === 'active' || ch.status === 'in_progress' ? 'text-green-400' : 'text-silver-dim'}`}>
                    {ch.status.charAt(0).toUpperCase() + ch.status.slice(1).replace('_', ' ')}
                  </span>
                  {(ch.status === 'active' || ch.status === 'in_progress') && (
                    <button
                      onClick={() => setActiveChallenge(ch.id)}
                      className="bg-cyan/10 hover:bg-cyan/20 text-cyan border border-cyan/30 rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer"
                    >
                      Enter
                    </button>
                  )}
                  {ch.status === 'completed' && (
                    <span className="text-xs text-silver-dim">Finished</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

function ChallengeInterface({ challengeId, onBack }: { challengeId: number; onBack: () => void }) {
  const [details, setDetails] = useState<ChallengeDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submission, setSubmission] = useState<DebugSubmission | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])

  useEffect(() => {
    api.get(`/debugging/challenges/${challengeId}/details`).then((res) => {
      setDetails(res.data)
      setCode(res.data.challenge.buggy_code)
    }).catch(() => {}).finally(() => setLoading(false))

    api.get(`/debugging/challenges/${challengeId}/leaderboard`).then((res) => {
      const data = res.data
      setLeaderboard(Array.isArray(data) ? data : data.entries ?? [])
    }).catch(() => {})
  }, [challengeId])

  const handleSubmit = useCallback(async () => {
    if (submitting || !code.trim()) return
    setSubmitting(true)
    try {
      const res = await api.post(`/debugging/submit?challenge_id=${challengeId}`, {
        submitted_code: code,
      })
      setSubmission(res.data)
      api.get(`/debugging/challenges/${challengeId}/leaderboard`).then((res) => {
        const data = res.data
        setLeaderboard(Array.isArray(data) ? data : data.entries ?? [])
      }).catch(() => {})
    } catch {}
    setSubmitting(false)
  }, [challengeId, code, submitting])

  if (loading) {
    return (
      <div>
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-silver-dim hover:text-silver mb-6 transition-all cursor-pointer">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
          Back to Challenges
        </button>
        <Spinner />
      </div>
    )
  }

  if (!details) {
    return (
      <div>
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-silver-dim hover:text-silver mb-6 transition-all cursor-pointer">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
          Back to Challenges
        </button>
        <EmptyState icon="🐛" title="Challenge Unavailable" desc="Could not load this challenge." />
      </div>
    )
  }

  const { challenge, test_cases } = details

  return (
    <div className="max-w-7xl mx-auto animate-fade-in-up">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-silver-dim hover:text-silver mb-6 transition-all cursor-pointer">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
        Back to Challenges
      </button>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>{challenge.name}</h1>
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border ${difficultyColor[challenge.difficulty] ?? 'bg-silver/10 text-silver border-silver/20'}`}>
          {challenge.difficulty}
        </span>
        <span className="text-xs text-cyan font-medium">{challenge.points} pts</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-midnight-lighter/30">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
            </div>
            <span className="text-xs text-silver-dim ml-2">buggy_code</span>
          </div>
          <pre className="p-5 overflow-x-auto text-sm text-silver leading-relaxed font-mono">
            <code>{challenge.buggy_code}</code>
          </pre>
        </div>

        <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-midnight-lighter/30">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
              </div>
              <span className="text-xs text-silver-dim ml-2">Your Fix</span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting || !code.trim()}
              className="bg-cyan/10 hover:bg-cyan/20 text-cyan border border-cyan/30 rounded-lg px-4 py-1.5 text-xs font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center gap-1.5">
                  <div className="animate-spin h-3 w-3 border-2 border-cyan/30 border-t-cyan rounded-full" />
                  Running...
                </span>
              ) : 'Submit'}
            </button>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full h-80 bg-deep-black/60 text-silver font-mono text-sm leading-relaxed p-5 resize-none focus:outline-none placeholder-silver-dim/40"
            placeholder="Paste or write your fixed code here..."
            spellCheck={false}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <div className="lg:col-span-2 bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3" style={{ fontFamily: 'var(--font-display)' }}>Instructions</h3>
          <p className="text-sm text-silver-dim leading-relaxed whitespace-pre-wrap">{challenge.instructions}</p>
        </div>
        <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3" style={{ fontFamily: 'var(--font-display)' }}>Test Cases</h3>
          <div className="space-y-2">
            {test_cases.map((tc) => (
              <div key={tc.id} className="bg-midnight-light/20 border border-midnight-lighter/30 rounded-lg px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-silver font-medium">{tc.name}</span>
                  <span className="text-xs text-silver-dim">{tc.points} pts</span>
                </div>
                {!tc.is_hidden && (
                  <div className="mt-1.5 space-y-0.5">
                    <p className="text-[11px] text-silver-dim">Input: <span className="text-silver font-mono">{tc.input_data}</span></p>
                    <p className="text-[11px] text-silver-dim">Expected: <span className="text-silver font-mono">{tc.expected_output}</span></p>
                  </div>
                )}
                {tc.is_hidden && <p className="text-[11px] text-silver-dim/50 mt-1">Hidden test case</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {submission && (
        <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-5 mb-6 animate-fade-in-up">
          <h3 className="text-sm font-semibold text-white mb-3" style={{ fontFamily: 'var(--font-display)' }}>Submission Results</h3>
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-midnight-light/30 border border-midnight-lighter/30 rounded-lg px-4 py-2">
              <p className="text-xs text-silver-dim">Score</p>
              <p className="text-lg font-bold text-cyan" style={{ fontFamily: 'var(--font-display)' }}>{submission.score}</p>
            </div>
            {submission.execution_time_ms !== null && (
              <div className="bg-midnight-light/30 border border-midnight-lighter/30 rounded-lg px-4 py-2">
                <p className="text-xs text-silver-dim">Execution</p>
                <p className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>{submission.execution_time_ms}ms</p>
              </div>
            )}
            {submission.quality_score !== null && (
              <div className="bg-midnight-light/30 border border-midnight-lighter/30 rounded-lg px-4 py-2">
                <p className="text-xs text-silver-dim">Quality</p>
                <p className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>{submission.quality_score}</p>
              </div>
            )}
          </div>
          {submission.error_message && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-3 mb-3">
              <p className="text-xs text-red-400 font-mono">{submission.error_message}</p>
            </div>
          )}
          {submission.test_results != null && typeof submission.test_results === 'object' && (
            <div className="space-y-2">
              {(submission.test_results as { test_name: string; passed: boolean; input: string; expected: string; actual: string }[]).map((tr, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border ${tr.passed ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${tr.passed ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    {tr.passed ? (
                      <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    )}
                  </div>
                  <span className="text-xs text-silver font-medium flex-1">{tr.test_name}</span>
                  {!tr.passed && <span className="text-[11px] text-red-400 font-mono">Got: {tr.actual}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {leaderboard.length > 0 && (
        <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3" style={{ fontFamily: 'var(--font-display)' }}>Leaderboard</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-silver-dim border-b border-midnight-lighter/30">
                  <th className="text-left py-2 px-3 font-medium">Rank</th>
                  <th className="text-left py-2 px-3 font-medium">Team</th>
                  <th className="text-right py-2 px-3 font-medium">Score</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.slice(0, 10).map((entry) => (
                  <tr key={entry.team_id} className="border-b border-midnight-lighter/20 hover:bg-midnight-light/20 transition-colors">
                    <td className="py-2.5 px-3">
                      <span className={`text-xs font-bold ${entry.rank === 1 ? 'text-yellow-400' : entry.rank === 2 ? 'text-gray-300' : entry.rank === 3 ? 'text-amber-600' : 'text-silver-dim'}`}>
                        #{entry.rank}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-silver text-xs">{entry.team_name}</td>
                    <td className="py-2.5 px-3 text-right text-xs font-medium text-cyan">{entry.total_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
