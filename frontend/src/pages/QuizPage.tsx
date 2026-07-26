import { useState, useEffect, useCallback, useRef } from 'react'
import Layout from '../components/Layout'
import api from '../lib/api'
import type { Competition, QuizRound, QuizQuestion, QuizRoundResult } from '../lib/types'
import { useFetch, useWebSocket } from '../lib/hooks'

const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const

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

export default function QuizPage() {
  const [selectedCompetition, setSelectedCompetition] = useState<number | null>(null)
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [competitionsLoading, setCompetitionsLoading] = useState(true)
  const [activeRound, setActiveRound] = useState<number | null>(null)

  useEffect(() => {
    api.get('/competitions').then((res) => {
      const data = res.data
      setCompetitions(Array.isArray(data) ? data : data.data ?? [])
    }).catch(() => {}).finally(() => setCompetitionsLoading(false))
  }, [])

  const competitionId = selectedCompetition ?? competitions[0]?.id ?? null
  const { data: rounds, loading: roundsLoading } = useFetch<QuizRound[]>(
    competitionId ? `/quiz/rounds?competition_id=${competitionId}` : null,
    [competitionId]
  )

  if (activeRound !== null) {
    return (
      <Layout>
        <QuizInterface roundId={activeRound} onBack={() => setActiveRound(null)} />
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto animate-fade-in-up">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Quiz Arena
            </h1>
            <p className="text-sm text-silver-dim mt-1">Test your knowledge across multiple rounds</p>
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
        ) : roundsLoading ? (
          <Spinner />
        ) : !rounds || rounds.length === 0 ? (
          <EmptyState icon="📝" title="No Quiz Rounds" desc="No quiz rounds have been created for this competition yet." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {rounds.map((round, i) => (
              <div
                key={round.id}
                className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-5 hover:border-midnight-lighter/60 transition-all duration-300 animate-fade-in-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-silver-dim tracking-wider uppercase">Round {round.round_number}</span>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border ${difficultyColor[round.difficulty] ?? 'bg-silver/10 text-silver border-silver/20'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusDot[round.status] ?? 'bg-silver-dim'}`} />
                    {round.difficulty}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>{round.name}</h3>
                {round.description && <p className="text-xs text-silver-dim mb-4 line-clamp-2">{round.description}</p>}
                <div className="flex items-center gap-4 text-xs text-silver-dim mb-4">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {round.question_count} questions
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {round.time_limit_seconds}s per question
                  </span>
                  <span>{round.points_per_question} pts</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${round.status === 'completed' ? 'text-silver-dim' : round.status === 'active' || round.status === 'in_progress' ? 'text-green-400' : 'text-silver-dim'}`}>
                    {round.status.charAt(0).toUpperCase() + round.status.slice(1).replace('_', ' ')}
                  </span>
                  {(round.status === 'active' || round.status === 'in_progress') && (
                    <button
                      onClick={() => setActiveRound(round.id)}
                      className="bg-cyan/10 hover:bg-cyan/20 text-cyan border border-cyan/30 rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer"
                    >
                      Enter
                    </button>
                  )}
                  {round.status === 'completed' && (
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

function QuizInterface({ roundId, onBack }: { roundId: number; onBack: () => void }) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [_answers, setAnswers] = useState<Map<number, string>>(new Map())
  const [results, setResults] = useState<QuizRoundResult | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const startTimeRef = useRef<number>(Date.now())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const round = questions[0]?.round_id

  useWebSocket(
    round ? `ws://${window.location.host}/ws/quiz/${round}/${roundId}` : null,
    (data) => {
      if (typeof data.time_remaining === 'number') {
        setTimeLeft(data.time_remaining)
      }
      if (data.type === 'round_ended') {
        fetchResults()
      }
    }
  )

  const fetchResults = useCallback(async () => {
    try {
      const res = await api.get(`/quiz/rounds/${roundId}/results`)
      setResults(res.data)
    } catch {}
  }, [roundId])

  useEffect(() => {
    api.get(`/quiz/rounds/${roundId}/questions`).then((res) => {
      const data: QuizQuestion[] = res.data
      setQuestions(data)
      if (data.length > 0) {
        setTimeLeft(data[0].time_limit_seconds)
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [roundId])

  useEffect(() => {
    if (results || questions.length === 0) return
    const q = questions[currentIndex]
    if (!q) return

    startTimeRef.current = Date.now()
    setTimeLeft(q.time_limit_seconds)

    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
      const remaining = q.time_limit_seconds - elapsed
      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current)
        handleAutoAdvance()
      } else {
        setTimeLeft(remaining)
      }
    }, 200)

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [currentIndex, questions, results])

  const handleAutoAdvance = useCallback(() => {
    setSelectedAnswer(null)
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((p) => p + 1)
    } else {
      fetchResults()
    }
  }, [currentIndex, questions.length, fetchResults])

  const handleSubmit = async () => {
    if (!selectedAnswer || submitting) return
    const q = questions[currentIndex]
    const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000)
    if (timerRef.current) clearInterval(timerRef.current)

    setSubmitting(true)
    try {
      await api.post('/quiz/submit', {
        question_id: q.id,
        selected_answer: selectedAnswer,
        time_taken_seconds: timeTaken,
      })
      setAnswers((prev) => new Map(prev).set(q.id, selectedAnswer))
      setSelectedAnswer(null)
      if (currentIndex < questions.length - 1) {
        setCurrentIndex((p) => p + 1)
      } else {
        fetchResults()
      }
    } catch {}
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div>
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-silver-dim hover:text-silver mb-6 transition-all cursor-pointer">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
          Back to Rounds
        </button>
        <Spinner />
      </div>
    )
  }

  if (results) {
    return (
      <div className="max-w-3xl mx-auto animate-fade-in-up">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-silver-dim hover:text-silver mb-6 transition-all cursor-pointer">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
          Back to Rounds
        </button>
        <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-8 text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>Round Complete</h2>
          <p className="text-silver-dim text-sm mb-6">Here are your results</p>
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="bg-midnight-light/30 border border-midnight-lighter/30 rounded-lg p-4">
              <p className="text-xs text-silver-dim mb-1">Score</p>
              <p className="text-2xl font-bold text-cyan" style={{ fontFamily: 'var(--font-display)' }}>{results.total_points}</p>
            </div>
            <div className="bg-midnight-light/30 border border-midnight-lighter/30 rounded-lg p-4">
              <p className="text-xs text-silver-dim mb-1">Correct</p>
              <p className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                {results.correct_answers}/{results.total_questions}
              </p>
            </div>
            <div className="bg-midnight-light/30 border border-midnight-lighter/30 rounded-lg p-4">
              <p className="text-xs text-silver-dim mb-1">Avg Time</p>
              <p className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                {results.average_time.toFixed(1)}s
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          {results.answers.map((ans, i) => (
            <div
              key={ans.id}
              className={`bg-midnight/40 border rounded-xl p-4 flex items-center gap-4 ${ans.is_correct ? 'border-green-500/30' : 'border-red-500/30'}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${ans.is_correct ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-silver-dim">
                  Answered: <span className="text-silver font-medium">{ans.selected_answer}</span>
                </p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold ${ans.is_correct ? 'text-green-400' : 'text-red-400'}`}>
                  {ans.is_correct ? `+${ans.points_earned}` : '0'} pts
                </p>
                <p className="text-xs text-silver-dim">{ans.time_taken_seconds}s</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div>
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-silver-dim hover:text-silver mb-6 transition-all cursor-pointer">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
          Back to Rounds
        </button>
        <EmptyState icon="📝" title="No Questions" desc="This round has no questions yet." />
      </div>
    )
  }

  const question = questions[currentIndex]
  const progress = ((currentIndex + 1) / questions.length) * 100
  const timerPercent = (timeLeft / question.time_limit_seconds) * 100
  const timerUrgent = timeLeft <= 5

  return (
    <div className="max-w-3xl mx-auto animate-fade-in-up">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-silver-dim hover:text-silver mb-6 transition-all cursor-pointer">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
        Back to Rounds
      </button>

      <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-silver-dim">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span className="text-xs text-silver-dim">{question.points} pts</span>
        </div>
        <div className="w-full h-1.5 bg-midnight-light/40 rounded-full overflow-hidden mb-4">
          <div className="h-full bg-cyan/60 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${timerUrgent ? 'bg-red-400 animate-pulse' : 'bg-cyan'}`} />
            <span className={`text-sm font-mono font-medium ${timerUrgent ? 'text-red-400' : 'text-silver'}`}>{timeLeft}s</span>
          </div>
          <div className="w-24 h-1.5 bg-midnight-light/40 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-200 ${timerUrgent ? 'bg-red-400' : 'bg-cyan/50'}`}
              style={{ width: `${timerPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-6 mb-6">
        <p className="text-base text-white leading-relaxed mb-6" style={{ fontFamily: 'var(--font-display)' }}>{question.question_text}</p>
        <div className="space-y-3">
          {OPTION_KEYS.map((key) => {
            const text = question.options[key]
            if (!text) return null
            const isSelected = selectedAnswer === key
            return (
              <button
                key={key}
                onClick={() => setSelectedAnswer(key)}
                disabled={submitting}
                className={`w-full text-left flex items-center gap-4 px-5 py-3.5 rounded-lg border transition-all duration-200 cursor-pointer disabled:cursor-not-allowed ${
                  isSelected
                    ? 'bg-cyan/10 border-cyan/40 text-white'
                    : 'bg-midnight-light/20 border-midnight-lighter/40 text-silver hover:bg-midnight-light/40 hover:border-midnight-lighter/60'
                }`}
              >
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${isSelected ? 'bg-cyan/20 text-cyan' : 'bg-midnight-light/40 text-silver-dim'}`}>
                  {key}
                </span>
                <span className="text-sm">{text}</span>
              </button>
            )
          })}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!selectedAnswer || submitting}
        className="w-full bg-cyan/10 hover:bg-cyan/20 text-cyan border border-cyan/30 rounded-lg px-4 py-3 text-sm font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-cyan/30 border-t-cyan rounded-full" />
            Submitting...
          </span>
        ) : currentIndex < questions.length - 1 ? 'Next Question' : 'Submit & Finish'}
      </button>
    </div>
  )
}
