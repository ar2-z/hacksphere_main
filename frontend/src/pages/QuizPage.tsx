import { useState, useEffect, useCallback, useRef } from 'react'
import Layout from '../components/Layout'
import { useFetch, useRealtime } from '../lib/hooks'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import type { Competition, QuizQuestion, QuizSubmission } from '../lib/types'

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const

const difficultyColor: Record<string, string> = {
  easy: 'bg-green-500/10 text-green-400 border-green-500/20',
  medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  hard: 'bg-red-500/10 text-red-400 border-red-500/20',
}

export default function QuizPage() {
  const { user } = useAuth()
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string>('')
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([])
  const [showResults, setShowResults] = useState(false)
  const startTimeRef = useRef<number>(Date.now())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data: competitions, loading: competitionsLoading } = useFetch<Competition[]>(
    'competitions',
    { filters: { is_active: true }, order: { column: 'created_at', ascending: false } }
  )

  const { data: questions, loading: questionsLoading } = useFetch<QuizQuestion[]>(
    'quiz_questions',
    selectedCompetitionId
      ? { filters: { competition_id: selectedCompetitionId, is_active: true }, order: { column: 'round_number', ascending: true } }
      : undefined,
    [selectedCompetitionId]
  )

  useRealtime<QuizSubmission>('quiz_submissions', undefined, (payload) => {
    setSubmissions((prev) => {
      const exists = prev.find((s) => s.id === payload.id)
      if (exists) return prev.map((s) => (s.id === payload.id ? payload : s))
      return [...prev, payload]
    })
  })

  const allQuestions = questions ?? []
  const currentQuestion = allQuestions[activeQuestionIndex]
  const progress = allQuestions.length > 0 ? ((activeQuestionIndex + 1) / allQuestions.length) * 100 : 0
  const timerPercent = currentQuestion ? (timeLeft / currentQuestion.time_limit_seconds) * 100 : 0
  const timerUrgent = timeLeft <= 5

  useEffect(() => {
    if (!currentQuestion || showResults) return

    startTimeRef.current = Date.now()
    setTimeLeft(currentQuestion.time_limit_seconds)

    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
      const remaining = currentQuestion.time_limit_seconds - elapsed
      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current)
        handleAutoAdvance()
      } else {
        setTimeLeft(remaining)
      }
    }, 200)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [activeQuestionIndex, currentQuestion?.id, showResults])

  const handleAutoAdvance = useCallback(() => {
    setSelectedAnswer(null)
    if (activeQuestionIndex < allQuestions.length - 1) {
      setActiveQuestionIndex((p) => p + 1)
    } else {
      setShowResults(true)
    }
  }, [activeQuestionIndex, allQuestions.length])

  const handleSubmit = async () => {
    if (selectedAnswer === null || submitting || !currentQuestion || !user) return
    const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000)
    if (timerRef.current) clearInterval(timerRef.current)

    setSubmitting(true)
    try {
      const isCorrect = selectedAnswer === currentQuestion.correct_answer
      const pointsEarned = isCorrect ? currentQuestion.points : 0
      const { error } = await supabase.from('quiz_submissions').insert({
        team_id: '',
        question_id: currentQuestion.id,
        selected_answer: selectedAnswer,
        is_correct: isCorrect,
        points_earned: pointsEarned,
        time_taken_seconds: timeTaken,
      })
      if (error) throw error
      setSelectedAnswer(null)
      if (activeQuestionIndex < allQuestions.length - 1) {
        setActiveQuestionIndex((p) => p + 1)
      } else {
        setShowResults(true)
      }
    } catch {
    }
    setSubmitting(false)
  }

  const totalPoints = submissions.reduce((sum, s) => sum + s.points_earned, 0)
  const totalCorrect = submissions.filter((s) => s.is_correct).length
  const totalTime = submissions.reduce((sum, s) => sum + (s.time_taken_seconds ?? 0), 0)
  const avgTime = submissions.length > 0 ? totalTime / submissions.length : 0

  return (
    <Layout>
      <div className="space-y-8 max-w-4xl animate-fade-in-up">
        <div>
          <h1
            className="text-2xl font-bold text-white tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Quiz Arena
          </h1>
          <p className="text-sm text-muted mt-1">Answer questions and track your progress in real time</p>
        </div>

        {allQuestions.length === 0 && !questionsLoading && (
          <div className="flex items-center gap-4 mb-2">
            {competitionsLoading ? (
              <span className="text-sm text-muted">Loading competitions...</span>
            ) : (
              <select
                value={selectedCompetitionId}
                onChange={(e) => {
                  setSelectedCompetitionId(e.target.value)
                  setActiveQuestionIndex(0)
                  setSelectedAnswer(null)
                  setShowResults(false)
                  setSubmissions([])
                }}
                className="bg-frost/5 border border-frost/15 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent-cyan/40"
              >
                <option value="">Select a competition</option>
                {(competitions ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {questionsLoading && allQuestions.length === 0 && (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full" />
          </div>
        )}

        {!questionsLoading && allQuestions.length === 0 && selectedCompetitionId && (
          <div className="bg-navy/30 border border-frost/10 rounded-2xl p-10 text-center">
            <h3
              className="text-lg font-semibold text-white mb-2"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              No Questions Available
            </h3>
            <p className="text-sm text-muted/70 max-w-md mx-auto leading-relaxed">
              This competition does not have any active quiz questions yet.
            </p>
          </div>
        )}

        {showResults && allQuestions.length > 0 && (
          <div className="max-w-3xl mx-auto animate-fade-in-up">
            <button
              onClick={() => {
                setShowResults(false)
                setActiveQuestionIndex(0)
                setSubmissions([])
                setSelectedCompetitionId('')
              }}
              className="flex items-center gap-2 text-sm text-muted hover:text-white mb-6 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Start
            </button>

            <div className="bg-navy/40 border border-frost/10 rounded-xl p-8 text-center mb-6">
              <h2
                className="text-2xl font-bold text-white mb-2"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Quiz Complete
              </h2>
              <p className="text-muted text-sm mb-6">Here are your results</p>
              <div className="grid grid-cols-3 gap-6 mb-6">
                <div className="bg-frost/5 border border-frost/10 rounded-lg p-4">
                  <p className="text-xs text-muted mb-1">Score</p>
                  <p
                    className="text-2xl font-bold text-accent-violet"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {totalPoints}
                  </p>
                </div>
                <div className="bg-frost/5 border border-frost/10 rounded-lg p-4">
                  <p className="text-xs text-muted mb-1">Correct</p>
                  <p
                    className="text-2xl font-bold text-white"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {totalCorrect}/{allQuestions.length}
                  </p>
                </div>
                <div className="bg-frost/5 border border-frost/10 rounded-lg p-4">
                  <p className="text-xs text-muted mb-1">Avg Time</p>
                  <p
                    className="text-2xl font-bold text-white"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {avgTime.toFixed(1)}s
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {allQuestions.map((q, i) => {
                const sub = submissions.find((s) => s.question_id === q.id)
                return (
                  <div
                    key={q.id}
                    className={`bg-navy/40 border rounded-xl p-4 flex items-center gap-4 ${
                      sub?.is_correct ? 'border-green-500/30' : sub ? 'border-red-500/30' : 'border-frost/10'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                        sub?.is_correct
                          ? 'bg-green-500/10 text-green-400'
                          : sub
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-frost/10 text-muted'
                      }`}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted truncate">{q.question_text}</p>
                    </div>
                    <div className="text-right">
                      {sub ? (
                        <>
                          <p
                            className={`text-sm font-semibold ${
                              sub.is_correct ? 'text-green-400' : 'text-red-400'
                            }`}
                          >
                            {sub.is_correct ? `+${sub.points_earned}` : '0'} pts
                          </p>
                          <p className="text-xs text-muted">{sub.time_taken_seconds}s</p>
                        </>
                      ) : (
                        <p className="text-sm text-muted">Skipped</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {currentQuestion && !showResults && (
          <div className="max-w-3xl mx-auto animate-fade-in-up">
            <button
              onClick={() => {
                setShowResults(false)
                setActiveQuestionIndex(0)
                setSelectedAnswer(null)
                setSubmissions([])
              }}
              className="flex items-center gap-2 text-sm text-muted hover:text-white mb-6 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
              </svg>
              Exit Quiz
            </button>

            <div className="bg-navy/40 border border-frost/10 rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted">
                  Question {activeQuestionIndex + 1} of {allQuestions.length}
                </span>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                      difficultyColor[currentQuestion.difficulty] || 'bg-muted/10 text-muted border-muted/20'
                    }`}
                  >
                    {currentQuestion.difficulty}
                  </span>
                  <span className="text-xs text-muted">{currentQuestion.points} pts</span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-frost/10 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-accent-cyan/60 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      timerUrgent ? 'bg-red-400 animate-pulse' : 'bg-accent-cyan'
                    }`}
                  />
                  <span
                    className={`text-sm font-mono font-medium ${
                      timerUrgent ? 'text-red-400' : 'text-white'
                    }`}
                  >
                    {timeLeft}s
                  </span>
                </div>
                <div className="w-24 h-1.5 bg-frost/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-200 ${
                      timerUrgent ? 'bg-red-400' : 'bg-accent-cyan/50'
                    }`}
                    style={{ width: `${timerPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-navy/40 border border-frost/10 rounded-xl p-6 mb-6">
              <p
                className="text-base text-white leading-relaxed mb-6"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {currentQuestion.question_text}
              </p>
              <div className="space-y-3">
                {currentQuestion.options.map((text, idx) => {
                  const isSelected = selectedAnswer === idx
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedAnswer(idx)}
                      disabled={submitting}
                      className={`w-full text-left flex items-center gap-4 px-5 py-3.5 rounded-lg border transition-all duration-200 cursor-pointer disabled:cursor-not-allowed ${
                        isSelected
                          ? 'bg-accent-violet/10 border-accent-violet/40 text-white'
                          : 'bg-frost/5 border-frost/15 text-white hover:bg-frost/10 hover:border-frost/25'
                      }`}
                    >
                      <span
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                          isSelected
                            ? 'bg-accent-violet/20 text-accent-violet'
                            : 'bg-frost/10 text-muted'
                        }`}
                      >
                        {OPTION_LABELS[idx]}
                      </span>
                      <span className="text-sm">{text}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={selectedAnswer === null || submitting}
              className="w-full bg-accent-cyan/10 hover:bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30 rounded-lg px-4 py-3 text-sm font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full" />
                  Submitting...
                </span>
              ) : activeQuestionIndex < allQuestions.length - 1 ? (
                'Next Question'
              ) : (
                'Submit & Finish'
              )}
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}
