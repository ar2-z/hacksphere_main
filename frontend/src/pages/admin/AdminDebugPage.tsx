import { useState } from 'react'
import Layout from '../../components/Layout'
import api from '../../lib/api'
import { useFetch } from '../../lib/hooks'
import type { Competition } from '../../lib/types'

interface TestCase {
  id?: number
  name: string
  input_data: string
  expected_output: string
  is_hidden: boolean
  points: number
  order: number
}

interface DebugChallenge {
  id: number
  round_number: number
  name: string
  description: string
  difficulty: string
  buggy_code: string
  instructions: string
  time_limit_seconds: number
  points: number
  status: string
  test_cases?: TestCase[]
}

interface LeaderboardEntry {
  team_id: number
  team_name: string
  score: number
  rank: number
}

interface ChallengeForm {
  round_number: number
  name: string
  description: string
  difficulty: string
  buggy_code: string
  instructions: string
  time_limit_seconds: number
  points: number
  test_cases: TestCase[]
}

const defaultChallengeForm: ChallengeForm = {
  round_number: 1,
  name: '',
  description: '',
  difficulty: 'medium',
  buggy_code: '',
  instructions: '',
  time_limit_seconds: 300,
  points: 50,
  test_cases: [],
}

const defaultTestCase: TestCase = {
  name: '',
  input_data: '',
  expected_output: '',
  is_hidden: false,
  points: 10,
  order: 0,
}

const difficulties = ['easy', 'medium', 'hard', 'expert']

const statusColors: Record<string, string> = {
  draft: 'bg-silver/10 text-silver border border-silver/20',
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
  paused: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
  completed: 'bg-violet-500/10 text-violet-400 border border-violet-500/30',
}

export default function AdminDebugPage() {
  const [competitionId, setCompetitionId] = useState<string>('')
  const { data: competitions } = useFetch<Competition[]>('/competitions/')
  const { data: challenges, loading, refetch } = useFetch<DebugChallenge[]>(
    competitionId ? `/debugging/challenges?competition_id=${competitionId}` : null
  )

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false)
  const [selectedChallengeId, setSelectedChallengeId] = useState<number | null>(null)
  const [expandedChallengeId, setExpandedChallengeId] = useState<number | null>(null)
  const [form, setForm] = useState<ChallengeForm>(defaultChallengeForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: challengeDetails, loading: detailsLoading } = useFetch<DebugChallenge>(
    expandedChallengeId ? `/debugging/challenges/${expandedChallengeId}/admin` : null
  )
  const { data: leaderboard, loading: leaderboardLoading } = useFetch<LeaderboardEntry[]>(
    selectedChallengeId ? `/debugging/challenges/${selectedChallengeId}/leaderboard` : null
  )

  const handleCreate = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await api.post(`/debugging/challenges?competition_id=${competitionId}`, form)
      setShowCreateModal(false)
      setForm(defaultChallengeForm)
      refetch()
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to create challenge')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAction = async (id: number, action: 'start' | 'pause' | 'resume' | 'end') => {
    try {
      await api.post(`/debugging/challenges/${id}/${action}`)
      refetch()
    } catch (err: any) {
      alert(err?.response?.data?.detail || `Failed to ${action} challenge`)
    }
  }

  const addTestCase = () => {
    setForm({
      ...form,
      test_cases: [
        ...form.test_cases,
        { ...defaultTestCase, order: form.test_cases.length },
      ],
    })
  }

  const updateTestCase = (index: number, field: keyof TestCase, value: any) => {
    const updated = [...form.test_cases]
    updated[index] = { ...updated[index], [field]: value }
    setForm({ ...form, test_cases: updated })
  }

  const removeTestCase = (index: number) => {
    setForm({ ...form, test_cases: form.test_cases.filter((_, i) => i !== index) })
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1
            className="text-2xl font-bold text-white tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Debug Challenges
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <label className="text-sm text-silver-dim">Select Competition</label>
          <select
            value={competitionId}
            onChange={(e) => setCompetitionId(e.target.value)}
            className="bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver focus:outline-none focus:border-cyan/30 input-glow"
          >
            <option value="">Select a competition</option>
            {competitions?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {competitionId && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-cyan/10 hover:bg-cyan/20 text-cyan border border-cyan/30 rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer"
            >
              + Create Challenge
            </button>
          )}
        </div>

        {!competitionId ? (
          <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-12 text-center">
            <span className="text-4xl block mb-3">🐛</span>
            <p className="text-silver-dim">Select a competition to manage debug challenges</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-cyan/30 border-t-cyan rounded-full" />
          </div>
        ) : challenges && challenges.length > 0 ? (
          <div className="space-y-4 animate-fade-in-up">
            {challenges.map((challenge) => (
              <div
                key={challenge.id}
                className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[challenge.status] || ''}`}
                      >
                        {challenge.status}
                      </span>
                      <h3 className="text-sm font-semibold text-white">
                        Round {challenge.round_number}: {challenge.name}
                      </h3>
                    </div>
                    <p className="text-xs text-silver-dim">
                      {challenge.difficulty} · {challenge.time_limit_seconds}s · {challenge.points} pts
                    </p>
                    {challenge.description && (
                      <p className="text-xs text-silver-dim/70 line-clamp-1">
                        {challenge.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {challenge.status === 'draft' && (
                      <button
                        onClick={() => handleAction(challenge.id, 'start')}
                        className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer"
                      >
                        Start
                      </button>
                    )}
                    {challenge.status === 'active' && (
                      <>
                        <button
                          onClick={() => handleAction(challenge.id, 'pause')}
                          className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer"
                        >
                          Pause
                        </button>
                        <button
                          onClick={() => handleAction(challenge.id, 'end')}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer"
                        >
                          End
                        </button>
                      </>
                    )}
                    {challenge.status === 'paused' && (
                      <>
                        <button
                          onClick={() => handleAction(challenge.id, 'resume')}
                          className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer"
                        >
                          Resume
                        </button>
                        <button
                          onClick={() => handleAction(challenge.id, 'end')}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer"
                        >
                          End
                        </button>
                      </>
                    )}
                    <button
                      onClick={() =>
                        setExpandedChallengeId(
                          expandedChallengeId === challenge.id ? null : challenge.id
                        )
                      }
                      className="bg-midnight-lighter/30 hover:bg-midnight-lighter/50 text-silver-dim border border-midnight-lighter/40 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer"
                    >
                      {expandedChallengeId === challenge.id ? 'Hide' : 'Details'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedChallengeId(challenge.id)
                        setShowLeaderboardModal(true)
                      }}
                      className="bg-midnight-lighter/30 hover:bg-midnight-lighter/50 text-silver-dim border border-midnight-lighter/40 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer"
                    >
                      Leaderboard
                    </button>
                  </div>
                </div>

                {expandedChallengeId === challenge.id && (
                  <div className="mt-4 pt-4 border-t border-midnight-lighter/20">
                    {detailsLoading ? (
                      <div className="flex justify-center py-6">
                        <div className="animate-spin h-8 w-8 border-2 border-cyan/30 border-t-cyan rounded-full" />
                      </div>
                    ) : challengeDetails ? (
                      <div className="space-y-4">
                        {challengeDetails.instructions && (
                          <div className="bg-deep-black/40 border border-midnight-lighter/30 rounded-lg p-4">
                            <p className="text-xs text-silver-dim font-medium mb-1.5">
                              Instructions
                            </p>
                            <p className="text-sm text-silver whitespace-pre-wrap">
                              {challengeDetails.instructions}
                            </p>
                          </div>
                        )}
                        <div className="bg-deep-black/40 border border-midnight-lighter/30 rounded-lg p-4">
                          <p className="text-xs text-silver-dim font-medium mb-1.5">
                            Buggy Code
                          </p>
                          <pre className="text-xs text-silver font-mono whitespace-pre-wrap overflow-x-auto">
                            {challengeDetails.buggy_code}
                          </pre>
                        </div>
                        {challengeDetails.test_cases &&
                          challengeDetails.test_cases.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs text-silver-dim font-medium">Test Cases</p>
                              {challengeDetails.test_cases.map((tc, i) => (
                                <div
                                  key={tc.id || i}
                                  className="bg-deep-black/40 border border-midnight-lighter/30 rounded-lg p-3"
                                >
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className="text-xs font-medium text-white">
                                      {tc.name || `Test ${i + 1}`}
                                    </span>
                                    {tc.is_hidden && (
                                      <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                        Hidden
                                      </span>
                                    )}
                                    <span className="text-xs text-silver-dim">
                                      {tc.points} pts
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div>
                                      <span className="text-silver-dim/60 block mb-0.5">Input</span>
                                      <pre className="text-silver font-mono whitespace-pre-wrap bg-midnight/40 rounded p-2">
                                        {tc.input_data}
                                      </pre>
                                    </div>
                                    <div>
                                      <span className="text-silver-dim/60 block mb-0.5">
                                        Expected
                                      </span>
                                      <pre className="text-silver font-mono whitespace-pre-wrap bg-midnight/40 rounded p-2">
                                        {tc.expected_output}
                                      </pre>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                    ) : (
                      <p className="text-xs text-silver-dim text-center py-6">
                        No details available
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-12 text-center">
            <span className="text-4xl block mb-3">🐛</span>
            <p className="text-silver-dim">No debug challenges yet</p>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-midnight border border-midnight-lighter/40 rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2
              className="text-lg font-bold text-white mb-6"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Create Debug Challenge
            </h2>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-silver-dim mb-1.5">Round Number</label>
                  <input
                    type="number"
                    value={form.round_number}
                    onChange={(e) =>
                      setForm({ ...form, round_number: Number(e.target.value) })
                    }
                    className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver focus:outline-none focus:border-cyan/30 input-glow"
                  />
                </div>
                <div>
                  <label className="block text-xs text-silver-dim mb-1.5">Difficulty</label>
                  <select
                    value={form.difficulty}
                    onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                    className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver focus:outline-none focus:border-cyan/30 input-glow"
                  >
                    {difficulties.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-silver-dim mb-1.5">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Challenge name"
                  className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow"
                />
              </div>
              <div>
                <label className="block text-xs text-silver-dim mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Challenge description"
                  className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow resize-none min-h-[120px]"
                />
              </div>
              <div>
                <label className="block text-xs text-silver-dim mb-1.5">Instructions</label>
                <textarea
                  value={form.instructions}
                  onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                  placeholder="Instructions for participants"
                  className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow resize-none min-h-[120px]"
                />
              </div>
              <div>
                <label className="block text-xs text-silver-dim mb-1.5">Buggy Code</label>
                <textarea
                  value={form.buggy_code}
                  onChange={(e) => setForm({ ...form, buggy_code: e.target.value })}
                  placeholder="Paste the buggy code"
                  className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow resize-none min-h-[120px] font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-silver-dim mb-1.5">
                    Time Limit (seconds)
                  </label>
                  <input
                    type="number"
                    value={form.time_limit_seconds}
                    onChange={(e) =>
                      setForm({ ...form, time_limit_seconds: Number(e.target.value) })
                    }
                    className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver focus:outline-none focus:border-cyan/30 input-glow"
                  />
                </div>
                <div>
                  <label className="block text-xs text-silver-dim mb-1.5">Points</label>
                  <input
                    type="number"
                    value={form.points}
                    onChange={(e) =>
                      setForm({ ...form, points: Number(e.target.value) })
                    }
                    className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver focus:outline-none focus:border-cyan/30 input-glow"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-midnight-lighter/20">
                <div className="flex items-center justify-between mb-3">
                  <h3
                    className="text-sm font-bold text-white"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    Test Cases ({form.test_cases.length})
                  </h3>
                  <button
                    onClick={addTestCase}
                    className="bg-midnight-lighter/30 hover:bg-midnight-lighter/50 text-silver-dim border border-midnight-lighter/40 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer"
                  >
                    + Add Test Case
                  </button>
                </div>

                <div className="space-y-4">
                  {form.test_cases.map((tc, ti) => (
                    <div
                      key={ti}
                      className="bg-deep-black/40 border border-midnight-lighter/30 rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-silver-dim font-medium">
                            Test Case {ti + 1}
                          </span>
                          <input
                            type="text"
                            value={tc.name}
                            onChange={(e) => updateTestCase(ti, 'name', e.target.value)}
                            placeholder="Name (optional)"
                            className="bg-midnight/40 border border-midnight-lighter/40 rounded px-3 py-1.5 text-xs text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow w-32"
                          />
                          <label className="flex items-center gap-1.5 text-xs text-silver-dim cursor-pointer">
                            <input
                              type="checkbox"
                              checked={tc.is_hidden}
                              onChange={(e) =>
                                updateTestCase(ti, 'is_hidden', e.target.checked)
                              }
                              className="accent-cyan"
                            />
                            Hidden
                          </label>
                          <input
                            type="number"
                            value={tc.points}
                            onChange={(e) =>
                              updateTestCase(ti, 'points', Number(e.target.value))
                            }
                            className="bg-midnight/40 border border-midnight-lighter/40 rounded px-3 py-1.5 text-xs text-silver focus:outline-none focus:border-cyan/30 input-glow w-16"
                          />
                        </div>
                        <button
                          onClick={() => removeTestCase(ti)}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg px-2 py-1 text-xs transition-all cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-silver-dim/60 mb-1">
                            Input
                          </label>
                          <textarea
                            value={tc.input_data}
                            onChange={(e) =>
                              updateTestCase(ti, 'input_data', e.target.value)
                            }
                            placeholder="Input data"
                            className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow resize-none min-h-[80px] font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-silver-dim/60 mb-1">
                            Expected Output
                          </label>
                          <textarea
                            value={tc.expected_output}
                            onChange={(e) =>
                              updateTestCase(ti, 'expected_output', e.target.value)
                            }
                            placeholder="Expected output"
                            className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow resize-none min-h-[80px] font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setForm(defaultChallengeForm)
                  setError(null)
                }}
                className="bg-midnight-lighter/30 hover:bg-midnight-lighter/50 text-silver-dim border border-midnight-lighter/40 rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting || !form.name.trim()}
                className="bg-cyan/10 hover:bg-cyan/20 text-cyan border border-cyan/30 rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating...' : 'Create Challenge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLeaderboardModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-midnight border border-midnight-lighter/40 rounded-2xl p-6 max-w-lg w-full mx-4">
            <h2
              className="text-lg font-bold text-white mb-6"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Challenge Leaderboard
            </h2>

            {leaderboardLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin h-8 w-8 border-2 border-cyan/30 border-t-cyan rounded-full" />
              </div>
            ) : leaderboard && leaderboard.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-silver-dim text-xs uppercase tracking-wider">
                      <th className="text-left py-3 px-3">Rank</th>
                      <th className="text-left py-3 px-3">Team</th>
                      <th className="text-right py-3 px-3">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry) => (
                      <tr
                        key={entry.team_id}
                        className="border-b border-midnight-lighter/20"
                      >
                        <td className="py-3 px-3 text-white font-medium">#{entry.rank}</td>
                        <td className="py-3 px-3 text-silver">{entry.team_name}</td>
                        <td
                          className="py-3 px-3 text-right text-cyan font-bold"
                          style={{ fontFamily: 'var(--font-display)' }}
                        >
                          {entry.score}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <span className="text-3xl block mb-3">🏆</span>
                <p className="text-silver-dim text-sm">No submissions yet</p>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowLeaderboardModal(false)
                  setSelectedChallengeId(null)
                }}
                className="bg-midnight-lighter/30 hover:bg-midnight-lighter/50 text-silver-dim border border-midnight-lighter/40 rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}