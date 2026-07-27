import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabase'
import { useFetch } from '../../lib/hooks'
import type { DebugChallenge, QuizDifficulty, TestCase } from '../../lib/types'

interface DebugChallengeExt extends DebugChallenge {
  submission_count?: number
}

const difficultyOptions: QuizDifficulty[] = ['easy', 'medium', 'hard']

interface ChallengeForm {
  competition_id: string
  title: string
  description: string
  starter_code: string
  difficulty: QuizDifficulty
  points: number
  time_limit_minutes: number
  round_number: number
  test_cases: TestCase[]
}

const defaultForm: ChallengeForm = {
  competition_id: '',
  title: '',
  description: '',
  starter_code: '',
  difficulty: 'medium',
  points: 50,
  time_limit_minutes: 10,
  round_number: 1,
  test_cases: [{ input: '', expected: '', hidden: false }],
}

const defaultTestCase: TestCase = { input: '', expected: '', hidden: false }

const difficultyColor: Record<string, string> = {
  easy: 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30',
  medium: 'bg-accent-amber/10 text-accent-amber border border-accent-amber/30',
  hard: 'bg-accent-pink/10 text-accent-pink border border-accent-pink/30',
}

export default function AdminDebugPage() {
  const [competitionId, setCompetitionId] = useState<string>('')
  const { data: challenges, loading, refetch } = useFetch<DebugChallengeExt[]>(
    'debug_challenges',
    {
      filters: competitionId ? { competition_id: competitionId } : undefined,
      order: { column: 'created_at', ascending: false },
    },
    [competitionId]
  )
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ChallengeForm>(defaultForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submissionCounts, setSubmissionCounts] = useState<Record<string, number>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (!challenges || challenges.length === 0) return
    const fetchCounts = async () => {
      const counts: Record<string, number> = {}
      for (const c of challenges) {
        const { count } = await supabase
          .from('debug_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('challenge_id', c.id)
        counts[c.id] = count ?? 0
      }
      setSubmissionCounts(counts)
    }
    fetchCounts()
  }, [challenges])

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...defaultForm, competition_id: competitionId })
    setError(null)
    setShowModal(true)
  }

  const openEdit = (c: DebugChallenge) => {
    setEditingId(c.id)
    setForm({
      competition_id: c.competition_id,
      title: c.title,
      description: c.description,
      starter_code: c.starter_code ?? '',
      difficulty: c.difficulty,
      points: c.points,
      time_limit_minutes: c.time_limit_minutes,
      round_number: c.round_number,
      test_cases: c.test_cases?.length ? [...c.test_cases] : [{ input: '', expected: '', hidden: false }],
    })
    setError(null)
    setShowModal(true)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        competition_id: form.competition_id,
        title: form.title,
        description: form.description,
        starter_code: form.starter_code || null,
        difficulty: form.difficulty,
        points: form.points,
        time_limit_minutes: form.time_limit_minutes,
        round_number: form.round_number,
        test_cases: form.test_cases,
      }
      if (editingId) {
        const { error: err } = await supabase
          .from('debug_challenges')
          .update(payload)
          .eq('id', editingId)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from('debug_challenges').insert(payload)
        if (err) throw err
      }
      setShowModal(false)
      setEditingId(null)
      setForm(defaultForm)
      refetch()
    } catch (err: any) {
      setError(err?.message || 'Failed to save challenge')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this challenge?')) return
    const { error: err } = await supabase.from('debug_challenges').delete().eq('id', id)
    if (err) {
      alert(err.message)
    } else {
      refetch()
    }
  }

  const addTestCase = () => {
    setForm({ ...form, test_cases: [...form.test_cases, { ...defaultTestCase }] })
  }

  const updateTestCase = (index: number, field: keyof TestCase, value: any) => {
    const updated = [...form.test_cases]
    updated[index] = { ...updated[index], [field]: value }
    setForm({ ...form, test_cases: updated })
  }

  const removeTestCase = (index: number) => {
    if (form.test_cases.length <= 1) return
    setForm({ ...form, test_cases: form.test_cases.filter((_, i) => i !== index) })
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1
            className="text-2xl font-bold text-frost tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Debug Challenges
          </h1>
          {competitionId && (
            <button
              onClick={openCreate}
              className="bg-gradient-to-r from-accent-violet to-accent-cyan text-void font-semibold rounded-xl px-5 py-2.5 text-sm cursor-pointer"
            >
              Create Challenge
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <label className="text-sm text-frost-dim">Competition ID</label>
          <input
            type="text"
            value={competitionId}
            onChange={(e) => setCompetitionId(e.target.value)}
            placeholder="Enter competition ID"
            className="bg-void/60 border border-navy-lighter/60 rounded-xl px-4 py-2.5 text-sm text-frost placeholder-muted/30 focus:outline-none input-glow w-80"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-accent-violet/30 border-t-accent-violet rounded-full" />
          </div>
        ) : challenges && challenges.length > 0 ? (
          <div className="space-y-3">
            {challenges.map((challenge) => (
              <div key={challenge.id} className="bg-navy/40 border border-navy-border/40 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-semibold text-frost">{challenge.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${difficultyColor[challenge.difficulty] || ''}`}>
                        {challenge.difficulty}
                      </span>
                    </div>
                    <p className="text-xs text-frost-dim">
                      Round {challenge.round_number} &middot; {challenge.points} pts &middot; {challenge.time_limit_minutes} min &middot; {challenge.test_cases?.length ?? 0} test cases &middot; {submissionCounts[challenge.id] ?? 0} submissions
                    </p>
                    {challenge.description && (
                      <p className="text-xs text-muted line-clamp-2 mt-1">{challenge.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setExpandedId(expandedId === challenge.id ? null : challenge.id)}
                      className="bg-navy-lighter/60 hover:bg-navy-lighter/80 text-frost-dim border border-navy-border/40 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer"
                    >
                      {expandedId === challenge.id ? 'Hide' : 'Details'}
                    </button>
                    <button
                      onClick={() => openEdit(challenge)}
                      className="bg-navy-lighter/60 hover:bg-navy-lighter/80 text-frost-dim border border-navy-border/40 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(challenge.id)}
                      className="bg-accent-pink/10 hover:bg-accent-pink/20 text-accent-pink border border-accent-pink/30 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {expandedId === challenge.id && (
                  <div className="mt-4 pt-4 border-t border-navy-border/20 space-y-3">
                    {challenge.description && (
                      <div className="bg-void/40 border border-navy-border/30 rounded-xl p-4">
                        <p className="text-xs text-frost-dim font-medium mb-1">Description</p>
                        <p className="text-sm text-frost whitespace-pre-wrap">{challenge.description}</p>
                      </div>
                    )}
                    {challenge.starter_code && (
                      <div className="bg-void/40 border border-navy-border/30 rounded-xl p-4">
                        <p className="text-xs text-frost-dim font-medium mb-1">Starter Code</p>
                        <pre className="text-xs text-frost font-mono whitespace-pre-wrap overflow-x-auto">
                          {challenge.starter_code}
                        </pre>
                      </div>
                    )}
                    {challenge.test_cases && challenge.test_cases.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-frost-dim font-medium">Test Cases</p>
                        {challenge.test_cases.map((tc, i) => (
                          <div key={i} className="bg-void/40 border border-navy-border/30 rounded-xl p-3">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-xs font-medium text-frost">Case {i + 1}</span>
                              {tc.hidden && (
                                <span className="px-2 py-0.5 rounded-full text-xs bg-accent-amber/10 text-accent-amber border border-accent-amber/30">
                                  Hidden
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="text-muted block mb-0.5">Input</span>
                                <pre className="text-frost font-mono whitespace-pre-wrap bg-navy/40 rounded-lg p-2">
                                  {tc.input}
                                </pre>
                              </div>
                              <div>
                                <span className="text-muted block mb-0.5">Expected</span>
                                <pre className="text-frost font-mono whitespace-pre-wrap bg-navy/40 rounded-lg p-2">
                                  {tc.expected}
                                </pre>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-navy/40 border border-navy-border/40 rounded-xl p-12 text-center">
            <p className="text-frost-dim">
              {competitionId ? 'No challenges for this competition' : 'Enter a competition ID to view challenges'}
            </p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-void/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-navy border border-navy-border/40 rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2
              className="text-lg font-bold text-frost mb-6"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {editingId ? 'Edit Challenge' : 'Create Challenge'}
            </h2>

            {error && (
              <div className="bg-accent-pink/10 border border-accent-pink/30 rounded-xl p-3 mb-4 text-sm text-accent-pink">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-frost-dim mb-1.5">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Challenge title"
                  className="w-full bg-void/60 border border-navy-lighter/60 rounded-xl px-4 py-2.5 text-sm text-frost placeholder-muted/30 focus:outline-none input-glow"
                />
              </div>
              <div>
                <label className="block text-xs text-frost-dim mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Challenge description"
                  className="w-full bg-void/60 border border-navy-lighter/60 rounded-xl px-4 py-2.5 text-sm text-frost placeholder-muted/30 focus:outline-none input-glow resize-none min-h-[80px]"
                />
              </div>
              <div>
                <label className="block text-xs text-frost-dim mb-1.5">Starter Code</label>
                <textarea
                  value={form.starter_code}
                  onChange={(e) => setForm({ ...form, starter_code: e.target.value })}
                  placeholder="Paste the starter / buggy code"
                  className="w-full bg-void/60 border border-navy-lighter/60 rounded-xl px-4 py-2.5 text-sm text-frost placeholder-muted/30 focus:outline-none input-glow resize-none min-h-[120px] font-mono"
                />
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-frost-dim mb-1.5">Difficulty</label>
                  <select
                    value={form.difficulty}
                    onChange={(e) =>
                      setForm({ ...form, difficulty: e.target.value as QuizDifficulty })
                    }
                    className="w-full bg-void/60 border border-navy-lighter/60 rounded-xl px-4 py-2.5 text-sm text-frost focus:outline-none input-glow"
                  >
                    {difficultyOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-frost-dim mb-1.5">Points</label>
                  <input
                    type="number"
                    value={form.points}
                    onChange={(e) => setForm({ ...form, points: Number(e.target.value) })}
                    className="w-full bg-void/60 border border-navy-lighter/60 rounded-xl px-4 py-2.5 text-sm text-frost placeholder-muted/30 focus:outline-none input-glow"
                  />
                </div>
                <div>
                  <label className="block text-xs text-frost-dim mb-1.5">Time (min)</label>
                  <input
                    type="number"
                    value={form.time_limit_minutes}
                    onChange={(e) =>
                      setForm({ ...form, time_limit_minutes: Number(e.target.value) })
                    }
                    className="w-full bg-void/60 border border-navy-lighter/60 rounded-xl px-4 py-2.5 text-sm text-frost placeholder-muted/30 focus:outline-none input-glow"
                  />
                </div>
                <div>
                  <label className="block text-xs text-frost-dim mb-1.5">Round</label>
                  <input
                    type="number"
                    value={form.round_number}
                    onChange={(e) =>
                      setForm({ ...form, round_number: Number(e.target.value) })
                    }
                    className="w-full bg-void/60 border border-navy-lighter/60 rounded-xl px-4 py-2.5 text-sm text-frost placeholder-muted/30 focus:outline-none input-glow"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-frost-dim mb-1.5">Competition ID</label>
                <input
                  type="text"
                  value={form.competition_id}
                  onChange={(e) => setForm({ ...form, competition_id: e.target.value })}
                  placeholder="Competition ID"
                  className="w-full bg-void/60 border border-navy-lighter/60 rounded-xl px-4 py-2.5 text-sm text-frost placeholder-muted/30 focus:outline-none input-glow"
                />
              </div>

              <div className="pt-4 border-t border-navy-border/20">
                <div className="flex items-center justify-between mb-3">
                  <h3
                    className="text-sm font-bold text-frost"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    Test Cases ({form.test_cases.length})
                  </h3>
                  <button
                    onClick={addTestCase}
                    className="text-xs text-accent-cyan hover:text-accent-cyan/80 cursor-pointer"
                  >
                    + Add Test Case
                  </button>
                </div>

                <div className="space-y-4">
                  {form.test_cases.map((tc, ti) => (
                    <div
                      key={ti}
                      className="bg-void/40 border border-navy-border/30 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-frost-dim font-medium">Case {ti + 1}</span>
                          <label className="flex items-center gap-1.5 text-xs text-frost-dim cursor-pointer">
                            <input
                              type="checkbox"
                              checked={tc.hidden}
                              onChange={(e) => updateTestCase(ti, 'hidden', e.target.checked)}
                              className="accent-accent-amber"
                            />
                            Hidden
                          </label>
                        </div>
                        {form.test_cases.length > 1 && (
                          <button
                            onClick={() => removeTestCase(ti)}
                            className="text-accent-pink hover:text-accent-pink/80 text-xs cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-muted mb-1">Input</label>
                          <textarea
                            value={tc.input}
                            onChange={(e) => updateTestCase(ti, 'input', e.target.value)}
                            placeholder="Input data"
                            className="w-full bg-void/60 border border-navy-lighter/60 rounded-xl px-4 py-2.5 text-sm text-frost placeholder-muted/30 focus:outline-none input-glow resize-none min-h-[80px] font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-muted mb-1">Expected Output</label>
                          <textarea
                            value={tc.expected}
                            onChange={(e) => updateTestCase(ti, 'expected', e.target.value)}
                            placeholder="Expected output"
                            className="w-full bg-void/60 border border-navy-lighter/60 rounded-xl px-4 py-2.5 text-sm text-frost placeholder-muted/30 focus:outline-none input-glow resize-none min-h-[80px] font-mono"
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
                  setShowModal(false)
                  setEditingId(null)
                  setForm(defaultForm)
                  setError(null)
                }}
                className="bg-navy-lighter/60 hover:bg-navy-lighter/80 text-frost-dim border border-navy-border/40 rounded-xl px-4 py-2 text-sm font-medium transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !form.title.trim()}
                className="bg-gradient-to-r from-accent-violet to-accent-cyan text-void font-semibold rounded-xl px-5 py-2 text-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
