import { useState } from 'react'
import Layout from '../../components/Layout'
import api from '../../lib/api'
import { useFetch } from '../../lib/hooks'
import type { Competition } from '../../lib/types'

interface QuizRound {
  id: number
  round_number: number
  name: string
  description: string
  difficulty: string
  time_limit_seconds: number
  points_per_question: number
  time_bonus_points: number
  status: string
  questions?: QuizQuestion[]
}

interface QuizQuestion {
  id?: number
  question_text: string
  question_type: string
  options: string[]
  correct_answer: string
  explanation: string
  points: number
  time_limit_seconds: number
  order: number
}

interface LeaderboardEntry {
  team_id: number
  team_name: string
  score: number
  rank: number
}

interface RoundForm {
  round_number: number
  name: string
  description: string
  difficulty: string
  time_limit_seconds: number
  points_per_question: number
  time_bonus_points: number
  questions: QuizQuestion[]
}

const defaultRoundForm: RoundForm = {
  round_number: 1,
  name: '',
  description: '',
  difficulty: 'medium',
  time_limit_seconds: 30,
  points_per_question: 10,
  time_bonus_points: 5,
  questions: [],
}

const defaultQuestion: QuizQuestion = {
  question_text: '',
  question_type: 'multiple_choice',
  options: ['', '', '', ''],
  correct_answer: '',
  explanation: '',
  points: 10,
  time_limit_seconds: 30,
  order: 0,
}

const difficulties = ['easy', 'medium', 'hard', 'expert']
const questionTypes = ['multiple_choice', 'true_false', 'short_answer']

const statusColors: Record<string, string> = {
  draft: 'bg-silver/10 text-silver border border-silver/20',
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
  paused: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
  completed: 'bg-violet-500/10 text-violet-400 border border-violet-500/30',
}

export default function AdminQuizPage() {
  const [competitionId, setCompetitionId] = useState<string>('')
  const { data: competitions } = useFetch<Competition[]>('/competitions/')
  const { data: rounds, loading: roundsLoading, refetch } = useFetch<QuizRound[]>(
    competitionId ? `/quiz/rounds?competition_id=${competitionId}` : null
  )

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false)
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null)
  const [form, setForm] = useState<RoundForm>(defaultRoundForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedRoundId, setExpandedRoundId] = useState<number | null>(null)

  const { data: roundQuestions, loading: questionsLoading } = useFetch<QuizQuestion[]>(
    expandedRoundId ? `/quiz/rounds/${expandedRoundId}/questions/answers` : null
  )
  const { data: leaderboard, loading: leaderboardLoading } = useFetch<LeaderboardEntry[]>(
    selectedRoundId ? `/quiz/rounds/${selectedRoundId}/leaderboard` : null
  )

  const handleCreate = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await api.post(`/quiz/rounds?competition_id=${competitionId}`, form)
      setShowCreateModal(false)
      setForm(defaultRoundForm)
      refetch()
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to create round')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAction = async (roundId: number, action: 'start' | 'pause' | 'resume' | 'end') => {
    try {
      await api.post(`/quiz/rounds/${roundId}/${action}`)
      refetch()
    } catch (err: any) {
      alert(err?.response?.data?.detail || `Failed to ${action} round`)
    }
  }

  const addQuestion = () => {
    setForm({
      ...form,
      questions: [
        ...form.questions,
        { ...defaultQuestion, order: form.questions.length },
      ],
    })
  }

  const updateQuestion = (index: number, field: keyof QuizQuestion, value: any) => {
    const updated = [...form.questions]
    updated[index] = { ...updated[index], [field]: value }
    setForm({ ...form, questions: updated })
  }

  const removeQuestion = (index: number) => {
    setForm({ ...form, questions: form.questions.filter((_, i) => i !== index) })
  }

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    const updated = [...form.questions]
    const options = [...updated[qIndex].options]
    options[oIndex] = value
    updated[qIndex] = { ...updated[qIndex], options }
    setForm({ ...form, questions: updated })
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1
            className="text-2xl font-bold text-white tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Quiz Management
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
              + Create Round
            </button>
          )}
        </div>

        {!competitionId ? (
          <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-12 text-center">
            <span className="text-4xl block mb-3">🧠</span>
            <p className="text-silver-dim">Select a competition to manage quiz rounds</p>
          </div>
        ) : roundsLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-cyan/30 border-t-cyan rounded-full" />
          </div>
        ) : rounds && rounds.length > 0 ? (
          <div className="space-y-4 animate-fade-in-up">
            {rounds.map((round) => (
              <div key={round.id} className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[round.status] || ''}`}
                      >
                        {round.status}
                      </span>
                      <h3 className="text-sm font-semibold text-white">
                        Round {round.round_number}: {round.name}
                      </h3>
                    </div>
                    <p className="text-xs text-silver-dim">
                      {round.difficulty} · {round.time_limit_seconds}s per question · {round.points_per_question} pts · {round.time_bonus_points} bonus pts
                    </p>
                    {round.description && (
                      <p className="text-xs text-silver-dim/70">{round.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {round.status === 'draft' && (
                      <button
                        onClick={() => handleAction(round.id, 'start')}
                        className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer"
                      >
                        Start
                      </button>
                    )}
                    {round.status === 'active' && (
                      <>
                        <button
                          onClick={() => handleAction(round.id, 'pause')}
                          className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer"
                        >
                          Pause
                        </button>
                        <button
                          onClick={() => handleAction(round.id, 'end')}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer"
                        >
                          End
                        </button>
                      </>
                    )}
                    {round.status === 'paused' && (
                      <>
                        <button
                          onClick={() => handleAction(round.id, 'resume')}
                          className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer"
                        >
                          Resume
                        </button>
                        <button
                          onClick={() => handleAction(round.id, 'end')}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer"
                        >
                          End
                        </button>
                      </>
                    )}
                    <button
                      onClick={() =>
                        setExpandedRoundId(expandedRoundId === round.id ? null : round.id)
                      }
                      className="bg-midnight-lighter/30 hover:bg-midnight-lighter/50 text-silver-dim border border-midnight-lighter/40 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer"
                    >
                      {expandedRoundId === round.id ? 'Hide' : 'Questions'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRoundId(round.id)
                        setShowLeaderboardModal(true)
                      }}
                      className="bg-midnight-lighter/30 hover:bg-midnight-lighter/50 text-silver-dim border border-midnight-lighter/40 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer"
                    >
                      Leaderboard
                    </button>
                  </div>
                </div>

                {expandedRoundId === round.id && (
                  <div className="mt-4 pt-4 border-t border-midnight-lighter/20">
                    {questionsLoading ? (
                      <div className="flex justify-center py-6">
                        <div className="animate-spin h-8 w-8 border-2 border-cyan/30 border-t-cyan rounded-full" />
                      </div>
                    ) : roundQuestions && roundQuestions.length > 0 ? (
                      <div className="space-y-3">
                        {roundQuestions.map((q, i) => (
                          <div
                            key={q.id || i}
                            className="bg-deep-black/40 border border-midnight-lighter/30 rounded-lg p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1 min-w-0">
                                <p className="text-xs text-silver-dim">
                                  Q{i + 1} · {q.question_type} · {q.points} pts
                                </p>
                                <p className="text-sm text-white">{q.question_text}</p>
                                {q.options && q.options.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {q.options.map((opt, oi) => (
                                      <span
                                        key={oi}
                                        className={`text-xs px-2 py-0.5 rounded-full ${
                                          opt === q.correct_answer
                                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                            : 'bg-midnight-lighter/30 text-silver-dim border border-midnight-lighter/20'
                                        }`}
                                      >
                                        {opt}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {q.explanation && (
                                  <p className="text-xs text-silver-dim/60 mt-1">{q.explanation}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-silver-dim text-center py-6">No questions added yet</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-12 text-center">
            <span className="text-4xl block mb-3">📝</span>
            <p className="text-silver-dim">No quiz rounds yet</p>
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
              Create Quiz Round
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
                    onChange={(e) => setForm({ ...form, round_number: Number(e.target.value) })}
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
                  placeholder="Round name"
                  className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow"
                />
              </div>
              <div>
                <label className="block text-xs text-silver-dim mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Round description"
                  className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow resize-none min-h-[120px]"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-silver-dim mb-1.5">Time Limit (s)</label>
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
                  <label className="block text-xs text-silver-dim mb-1.5">Points/Question</label>
                  <input
                    type="number"
                    value={form.points_per_question}
                    onChange={(e) =>
                      setForm({ ...form, points_per_question: Number(e.target.value) })
                    }
                    className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver focus:outline-none focus:border-cyan/30 input-glow"
                  />
                </div>
                <div>
                  <label className="block text-xs text-silver-dim mb-1.5">Time Bonus</label>
                  <input
                    type="number"
                    value={form.time_bonus_points}
                    onChange={(e) =>
                      setForm({ ...form, time_bonus_points: Number(e.target.value) })
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
                    Questions ({form.questions.length})
                  </h3>
                  <button
                    onClick={addQuestion}
                    className="bg-midnight-lighter/30 hover:bg-midnight-lighter/50 text-silver-dim border border-midnight-lighter/40 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer"
                  >
                    + Add Question
                  </button>
                </div>

                <div className="space-y-4">
                  {form.questions.map((q, qi) => (
                    <div
                      key={qi}
                      className="bg-deep-black/40 border border-midnight-lighter/30 rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-silver-dim font-medium">
                          Question {qi + 1}
                        </span>
                        <button
                          onClick={() => removeQuestion(qi)}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg px-2 py-1 text-xs transition-all cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                      <input
                        type="text"
                        value={q.question_text}
                        onChange={(e) => updateQuestion(qi, 'question_text', e.target.value)}
                        placeholder="Question text"
                        className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow"
                      />
                      <div className="grid grid-cols-3 gap-3">
                        <select
                          value={q.question_type}
                          onChange={(e) => updateQuestion(qi, 'question_type', e.target.value)}
                          className="bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver focus:outline-none focus:border-cyan/30 input-glow"
                        >
                          {questionTypes.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={q.points}
                          onChange={(e) =>
                            updateQuestion(qi, 'points', Number(e.target.value))
                          }
                          placeholder="Points"
                          className="bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow"
                        />
                        <input
                          type="number"
                          value={q.time_limit_seconds}
                          onChange={(e) =>
                            updateQuestion(qi, 'time_limit_seconds', Number(e.target.value))
                          }
                          placeholder="Time (s)"
                          className="bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow"
                        />
                      </div>
                      {q.question_type === 'multiple_choice' && (
                        <div className="grid grid-cols-2 gap-2">
                          {q.options.map((opt, oi) => (
                            <input
                              key={oi}
                              type="text"
                              value={opt}
                              onChange={(e) => updateOption(qi, oi, e.target.value)}
                              placeholder={`Option ${oi + 1}`}
                              className="bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow"
                            />
                          ))}
                        </div>
                      )}
                      <input
                        type="text"
                        value={q.correct_answer}
                        onChange={(e) => updateQuestion(qi, 'correct_answer', e.target.value)}
                        placeholder="Correct answer"
                        className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow"
                      />
                      <input
                        type="text"
                        value={q.explanation}
                        onChange={(e) => updateQuestion(qi, 'explanation', e.target.value)}
                        placeholder="Explanation (optional)"
                        className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setForm(defaultRoundForm)
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
                {submitting ? 'Creating...' : 'Create Round'}
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
              Round Leaderboard
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
                  setSelectedRoundId(null)
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