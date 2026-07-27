import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabase'
import { useFetch } from '../../lib/hooks'
import type { QuizQuestion, QuizDifficulty } from '../../lib/types'

interface QuizQuestionWithCount extends QuizQuestion {
  submission_count?: number
}

const difficultyOptions: QuizDifficulty[] = ['easy', 'medium', 'hard']

interface QuestionForm {
  competition_id: string
  question_text: string
  options: string[]
  correct_answer: number
  difficulty: QuizDifficulty
  points: number
  time_limit_seconds: number
  round_number: number
  is_active: boolean
}

const defaultForm: QuestionForm = {
  competition_id: '',
  question_text: '',
  options: ['', '', '', ''],
  correct_answer: 0,
  difficulty: 'medium',
  points: 10,
  time_limit_seconds: 30,
  round_number: 1,
  is_active: true,
}

export default function AdminQuizPage() {
  const [competitionId, setCompetitionId] = useState<string>('')
  const { data: questions, loading, refetch } = useFetch<QuizQuestionWithCount[]>(
    'quiz_questions',
    {
      filters: competitionId ? { competition_id: competitionId } : undefined,
      order: { column: 'created_at', ascending: false },
    },
    [competitionId]
  )
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<QuestionForm>(defaultForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submissionCounts, setSubmissionCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!questions || questions.length === 0) return
    const fetchCounts = async () => {
      const counts: Record<string, number> = {}
      for (const q of questions) {
        const { count } = await supabase
          .from('quiz_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('question_id', q.id)
        counts[q.id] = count ?? 0
      }
      setSubmissionCounts(counts)
    }
    fetchCounts()
  }, [questions])

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...defaultForm, competition_id: competitionId })
    setError(null)
    setShowModal(true)
  }

  const openEdit = (q: QuizQuestion) => {
    setEditingId(q.id)
    setForm({
      competition_id: q.competition_id,
      question_text: q.question_text,
      options: [...q.options],
      correct_answer: q.correct_answer,
      difficulty: q.difficulty,
      points: q.points,
      time_limit_seconds: q.time_limit_seconds,
      round_number: q.round_number,
      is_active: q.is_active,
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
        question_text: form.question_text,
        options: form.options.filter((o) => o.trim() !== ''),
        correct_answer: form.correct_answer,
        difficulty: form.difficulty,
        points: form.points,
        time_limit_seconds: form.time_limit_seconds,
        round_number: form.round_number,
        is_active: form.is_active,
      }
      if (editingId) {
        const { error: err } = await supabase
          .from('quiz_questions')
          .update(payload)
          .eq('id', editingId)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from('quiz_questions').insert(payload)
        if (err) throw err
      }
      setShowModal(false)
      setEditingId(null)
      setForm(defaultForm)
      refetch()
    } catch (err: any) {
      setError(err?.message || 'Failed to save question')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this question?')) return
    const { error: err } = await supabase.from('quiz_questions').delete().eq('id', id)
    if (err) {
      alert(err.message)
    } else {
      refetch()
    }
  }

  const updateOption = (index: number, value: string) => {
    const updated = [...form.options]
    updated[index] = value
    setForm({ ...form, options: updated })
  }

  const addOption = () => {
    setForm({ ...form, options: [...form.options, ''] })
  }

  const removeOption = (index: number) => {
    const updated = form.options.filter((_, i) => i !== index)
    setForm({ ...form, options: updated, correct_answer: Math.min(form.correct_answer, updated.length - 1) })
  }

  const difficultyColor: Record<string, string> = {
    easy: 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30',
    medium: 'bg-accent-amber/10 text-accent-amber border border-accent-amber/30',
    hard: 'bg-accent-pink/10 text-accent-pink border border-accent-pink/30',
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1
            className="text-2xl font-bold text-frost tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Quiz Questions
          </h1>
          {competitionId && (
            <button
              onClick={openCreate}
              className="bg-gradient-to-r from-accent-violet to-accent-cyan text-void font-semibold rounded-xl px-5 py-2.5 text-sm cursor-pointer"
            >
              Create Question
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
        ) : questions && questions.length > 0 ? (
          <div className="bg-navy/40 border border-navy-border/40 rounded-xl p-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-frost-dim text-xs uppercase tracking-wider">
                  <th className="text-left py-3 px-4">Question</th>
                  <th className="text-left py-3 px-4">Options</th>
                  <th className="text-left py-3 px-4">Correct</th>
                  <th className="text-left py-3 px-4">Difficulty</th>
                  <th className="text-left py-3 px-4">Points</th>
                  <th className="text-left py-3 px-4">Time (s)</th>
                  <th className="text-left py-3 px-4">Round</th>
                  <th className="text-left py-3 px-4">Submissions</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q) => (
                  <tr key={q.id} className="border-b border-navy-border/20">
                    <td className="py-3 px-4 text-frost font-medium max-w-[200px] truncate">
                      {q.question_text}
                    </td>
                    <td className="py-3 px-4 text-frost-dim text-xs">
                      {q.options.join(', ')}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30">
                        {q.options[q.correct_answer] ?? q.correct_answer}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${difficultyColor[q.difficulty] || ''}`}>
                        {q.difficulty}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-frost-dim">{q.points}</td>
                    <td className="py-3 px-4 text-frost-dim">{q.time_limit_seconds}</td>
                    <td className="py-3 px-4 text-frost-dim">{q.round_number}</td>
                    <td className="py-3 px-4 text-frost-dim">{submissionCounts[q.id] ?? 0}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(q)}
                          className="bg-navy-lighter/60 hover:bg-navy-lighter/80 text-frost-dim border border-navy-border/40 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(q.id)}
                          className="bg-accent-pink/10 hover:bg-accent-pink/20 text-accent-pink border border-accent-pink/30 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-navy/40 border border-navy-border/40 rounded-xl p-12 text-center">
            <p className="text-frost-dim">
              {competitionId ? 'No questions for this competition' : 'Enter a competition ID to view questions'}
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
              {editingId ? 'Edit Question' : 'Create Question'}
            </h2>

            {error && (
              <div className="bg-accent-pink/10 border border-accent-pink/30 rounded-xl p-3 mb-4 text-sm text-accent-pink">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-frost-dim mb-1.5">Question Text</label>
                <textarea
                  value={form.question_text}
                  onChange={(e) => setForm({ ...form, question_text: e.target.value })}
                  placeholder="Enter the question"
                  className="w-full bg-void/60 border border-navy-lighter/60 rounded-xl px-4 py-2.5 text-sm text-frost placeholder-muted/30 focus:outline-none input-glow resize-none min-h-[80px]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-frost-dim">Options</label>
                  <button
                    onClick={addOption}
                    className="text-xs text-accent-cyan hover:text-accent-cyan/80 cursor-pointer"
                  >
                    + Add Option
                  </button>
                </div>
                <div className="space-y-2">
                  {form.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correct_answer"
                        checked={form.correct_answer === i}
                        onChange={() => setForm({ ...form, correct_answer: i })}
                        className="accent-accent-cyan cursor-pointer"
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updateOption(i, e.target.value)}
                        placeholder={`Option ${i + 1}`}
                        className="flex-1 bg-void/60 border border-navy-lighter/60 rounded-xl px-4 py-2.5 text-sm text-frost placeholder-muted/30 focus:outline-none input-glow"
                      />
                      {form.options.length > 2 && (
                        <button
                          onClick={() => removeOption(i)}
                          className="text-accent-pink hover:text-accent-pink/80 text-xs cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted mt-1">Select the correct answer with the radio button</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
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
                  <label className="block text-xs text-frost-dim mb-1.5">Time Limit (s)</label>
                  <input
                    type="number"
                    value={form.time_limit_seconds}
                    onChange={(e) =>
                      setForm({ ...form, time_limit_seconds: Number(e.target.value) })
                    }
                    className="w-full bg-void/60 border border-navy-lighter/60 rounded-xl px-4 py-2.5 text-sm text-frost placeholder-muted/30 focus:outline-none input-glow"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-frost-dim mb-1.5">Round Number</label>
                  <input
                    type="number"
                    value={form.round_number}
                    onChange={(e) =>
                      setForm({ ...form, round_number: Number(e.target.value) })
                    }
                    className="w-full bg-void/60 border border-navy-lighter/60 rounded-xl px-4 py-2.5 text-sm text-frost placeholder-muted/30 focus:outline-none input-glow"
                  />
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
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      form.is_active ? 'bg-accent-cyan' : 'bg-navy-lighter'
                    }`}
                    onClick={() => setForm({ ...form, is_active: !form.is_active })}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-frost rounded-full transition-transform ${
                        form.is_active ? 'translate-x-5' : ''
                      }`}
                    />
                  </div>
                  <span className="text-sm text-frost-dim">
                    {form.is_active ? 'Active' : 'Inactive'}
                  </span>
                </label>
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
                disabled={submitting || !form.question_text.trim()}
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
