import { useState } from 'react'
import Layout from '../../components/Layout'
import { useFetch } from '../../lib/hooks'
import api from '../../lib/api'
import type { Competition } from '../../lib/types'

interface PresentationScore {
  id: string
  presentation_id: string
  category: string
  score: number
  max_score: number
  feedback: string | null
  created_at: string
}

interface PresentationQueueItem {
  presentation_id: number
  team_id: number
  team_name: string
  presentation_order: number | null
  status: string
  problem_category: string
  presented_at: string | null
  total_score: number | null
}

interface PresentationWithScores extends PresentationQueueItem {
  scores?: PresentationScore[]
}

const statusColors: Record<string, string> = {
  pending: 'bg-silver/10 text-silver border border-silver/20',
  in_progress: 'bg-cyan/10 text-cyan border border-cyan/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  disqualified: 'bg-red-500/10 text-red-400 border border-red-500/20',
}

export default function AdminIdeathonPage() {
  const [competitionId, setCompetitionId] = useState<string>('')
  const { data: competitions } = useFetch<Competition[]>('/competitions/')
  const { data: presentations, loading, refetch } = useFetch<PresentationQueueItem[]>(
    competitionId ? `/ideathon/competitions/${competitionId}/queue` : null,
    [competitionId]
  )
  const [selectedPresentation, setSelectedPresentation] = useState<PresentationWithScores | null>(null)
  const [showScoreModal, setShowScoreModal] = useState(false)
  const [scoreForm, setScoreForm] = useState({ category: '', score: '', max_score: '10', feedback: '' })
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [results, setResults] = useState<unknown>(null)
  const [showResults, setShowResults] = useState(false)

  const handleAction = async (presentationId: number, action: 'start' | 'complete') => {
    setActionLoading(presentationId)
    setError('')
    setSuccess('')
    try {
      await api.post(`/ideathon/presentations/${presentationId}/${action}`)
      setSuccess(`Presentation ${action === 'start' ? 'started' : 'completed'} successfully`)
      refetch()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed'
      setError(msg)
    } finally {
      setActionLoading(null)
    }
  }

  const handleScore = async (presentationId: number) => {
    setActionLoading(presentationId)
    setError('')
    setSuccess('')
    try {
      await api.post(`/ideathon/presentations/${presentationId}/score`, {
        category: scoreForm.category,
        score: parseFloat(scoreForm.score),
        max_score: parseFloat(scoreForm.max_score),
        feedback: scoreForm.feedback || null,
      })
      setSuccess('Score submitted successfully')
      setShowScoreModal(false)
      setScoreForm({ category: '', score: '', max_score: '10', feedback: '' })
      refetch()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Scoring failed'
      setError(msg)
    } finally {
      setActionLoading(null)
    }
  }

  const viewScores = async (presentationId: number) => {
    setActionLoading(presentationId)
    try {
      const res = await api.get(`/ideathon/presentations/${presentationId}`)
      setSelectedPresentation(res.data as PresentationWithScores)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch scores'
      setError(msg)
    } finally {
      setActionLoading(null)
    }
  }

  const generateOrder = async () => {
    if (!competitionId) return
    setActionLoading(-1)
    setError('')
    setSuccess('')
    try {
      await api.post(`/ideathon/competitions/${competitionId}/generate-order`)
      setSuccess('Presentation order generated successfully')
      refetch()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate order'
      setError(msg)
    } finally {
      setActionLoading(null)
    }
  }

  const fetchResults = async () => {
    if (!competitionId) return
    setActionLoading(-2)
    try {
      const res = await api.get(`/ideathon/competitions/${competitionId}/results`)
      setResults(res.data)
      setShowResults(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch results'
      setError(msg)
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Ideathon Management
          </h1>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <label className="text-sm text-silver-dim">Select Competition</label>
          <select
            value={competitionId}
            onChange={(e) => setCompetitionId(e.target.value)}
            className="bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver focus:outline-none focus:border-cyan/30 input-glow appearance-none"
          >
            <option value="">Choose a competition</option>
            {competitions?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {competitionId && (
            <>
              <button
                onClick={generateOrder}
                disabled={actionLoading === -1}
                className="bg-cyan/10 hover:bg-cyan/20 text-cyan border border-cyan/30 rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer disabled:opacity-40"
              >
                {actionLoading === -1 ? 'Generating...' : 'Generate Order'}
              </button>
              <button
                onClick={fetchResults}
                disabled={actionLoading === -2}
                className="bg-cyan/10 hover:bg-cyan/20 text-cyan border border-cyan/30 rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer disabled:opacity-40"
              >
                {actionLoading === -2 ? 'Loading...' : 'View Results'}
              </button>
            </>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">{error}</div>
        )}
        {success && (
          <div className="bg-cyan/10 border border-cyan/30 rounded-lg p-3 text-sm text-cyan">{success}</div>
        )}

        {!competitionId ? (
          <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-12 text-center animate-fade-in-up">
            <div className="w-16 h-16 bg-midnight-light/30 border border-midnight-lighter/40 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-silver-dim/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              Select a Competition
            </h3>
            <p className="text-sm text-silver-dim/70 max-w-md mx-auto">
              Choose a competition above to manage ideathon presentations, scores, and results.
            </p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-cyan/30 border-t-cyan rounded-full" />
          </div>
        ) : presentations && presentations.length > 0 ? (
          <div className="space-y-3 animate-fade-in-up">
            {presentations.map((p) => (
              <div key={p.presentation_id} className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-5 hover:border-midnight-lighter/60 transition-all">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4 min-w-0">
                    {p.presentation_order != null && (
                      <div className="w-10 h-10 bg-cyan/10 border border-cyan/20 rounded-lg flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-cyan" style={{ fontFamily: 'var(--font-display)' }}>
                          #{p.presentation_order}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-white truncate">{p.team_name}</h3>
                      <p className="text-xs text-silver-dim truncate max-w-lg">{p.problem_category}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[p.status] || statusColors.pending}`}>
                      {p.status}
                    </span>
                    {p.total_score != null && (
                      <span className="text-sm font-medium text-cyan" style={{ fontFamily: 'var(--font-display)' }}>
                        {p.total_score} pts
                      </span>
                    )}

                    <div className="flex items-center gap-2">
                      {p.status === 'pending' && (
                        <button
                          onClick={() => handleAction(p.presentation_id, 'start')}
                          disabled={actionLoading === p.presentation_id}
                          className="bg-cyan/10 hover:bg-cyan/20 text-cyan border border-cyan/30 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer disabled:opacity-40"
                        >
                          Start
                        </button>
                      )}
                      {p.status === 'in_progress' && (
                        <button
                          onClick={() => handleAction(p.presentation_id, 'complete')}
                          disabled={actionLoading === p.presentation_id}
                          className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer disabled:opacity-40"
                        >
                          Complete
                        </button>
                      )}
                      <button
                        onClick={() => { setSelectedPresentation(p); setShowScoreModal(true); setScoreForm({ category: '', score: '', max_score: '10', feedback: '' }) }}
                        className="bg-cyan/10 hover:bg-cyan/20 text-cyan border border-cyan/30 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer"
                      >
                        Score
                      </button>
                      <button
                        onClick={() => viewScores(p.presentation_id)}
                        disabled={actionLoading === p.presentation_id}
                        className="bg-midnight-light/40 hover:bg-midnight-light/60 text-silver border border-midnight-lighter/40 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer disabled:opacity-40"
                      >
                        View Scores
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-12 text-center">
            <svg className="w-10 h-10 text-silver-dim/30 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-silver-dim">No presentations in queue yet</p>
          </div>
        )}

        {showResults && results != null && (
          <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-6 animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                Competition Results
              </h2>
              <button
                onClick={() => { setShowResults(false); setResults(null) }}
                className="text-silver-dim hover:text-silver text-sm transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
            <pre className="text-sm text-silver-dim overflow-auto max-h-96 whitespace-pre-wrap">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {showScoreModal && selectedPresentation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-midnight border border-midnight-lighter/40 rounded-2xl p-6 w-full max-w-md animate-fade-in-up">
            <h3 className="text-lg font-bold text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
              Score Presentation
            </h3>
            <p className="text-sm text-silver-dim mb-5">{selectedPresentation.team_name}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-silver-dim mb-1.5 tracking-wider uppercase">Category</label>
                <input
                  type="text"
                  value={scoreForm.category}
                  onChange={(e) => setScoreForm((s) => ({ ...s, category: e.target.value }))}
                  placeholder="e.g. Innovation, Presentation, Feasibility"
                  className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-silver-dim mb-1.5 tracking-wider uppercase">Score</label>
                  <input
                    type="number"
                    value={scoreForm.score}
                    onChange={(e) => setScoreForm((s) => ({ ...s, score: e.target.value }))}
                    placeholder="0"
                    className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-silver-dim mb-1.5 tracking-wider uppercase">Max Score</label>
                  <input
                    type="number"
                    value={scoreForm.max_score}
                    onChange={(e) => setScoreForm((s) => ({ ...s, max_score: e.target.value }))}
                    placeholder="10"
                    className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-silver-dim mb-1.5 tracking-wider uppercase">Feedback</label>
                <textarea
                  value={scoreForm.feedback}
                  onChange={(e) => setScoreForm((s) => ({ ...s, feedback: e.target.value }))}
                  placeholder="Optional feedback for the team..."
                  className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow resize-none min-h-[120px]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowScoreModal(false); setSelectedPresentation(null) }}
                className="bg-midnight-light/40 hover:bg-midnight-light/60 text-silver border border-midnight-lighter/40 rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => selectedPresentation && handleScore(selectedPresentation.presentation_id)}
                disabled={!scoreForm.category || !scoreForm.score || actionLoading === selectedPresentation?.presentation_id}
                className="bg-cyan/10 hover:bg-cyan/20 text-cyan border border-cyan/30 rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {actionLoading === selectedPresentation?.presentation_id ? 'Submitting...' : 'Submit Score'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPresentation && !showScoreModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-midnight border border-midnight-lighter/40 rounded-2xl p-6 w-full max-w-lg animate-fade-in-up">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                  Scores: {selectedPresentation.team_name}
                </h3>
                <p className="text-xs text-silver-dim">Total: {selectedPresentation.total_score ?? 0} pts</p>
              </div>
              <button
                onClick={() => setSelectedPresentation(null)}
                className="text-silver-dim hover:text-silver transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {selectedPresentation.scores && selectedPresentation.scores.length > 0 ? (
              <div className="space-y-3">
                {selectedPresentation.scores.map((s) => (
                  <div key={s.id} className="bg-deep-black/40 border border-midnight-lighter/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">{s.category}</span>
                      <span className="text-sm font-bold text-cyan" style={{ fontFamily: 'var(--font-display)' }}>
                        {s.score}/{s.max_score}
                      </span>
                    </div>
                    {s.feedback && <p className="text-xs text-silver-dim">{s.feedback}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-silver-dim text-center py-8">No scores recorded yet</p>
            )}
          </div>
        </div>
      )}
    </Layout>
  )
}
