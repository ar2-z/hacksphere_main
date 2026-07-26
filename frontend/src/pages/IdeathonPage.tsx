import { useState, useEffect, useCallback } from 'react'
import Layout from '../components/Layout'
import api from '../lib/api'
import type { Competition, Presentation } from '../lib/types'

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

interface QueueEntry {
  team_id: number
  team_name: string
  presentation_order: number
  status: string
  is_ready: boolean
}

interface IdeathonResult {
  rank: number
  team_id: number
  team_name: string
  total_score: number
  presentation_order: number | null
}

const statusColor: Record<string, string> = {
  draft: 'text-silver-dim',
  ready: 'text-green-400',
  presenting: 'text-cyan',
  completed: 'text-silver-dim/70',
  scored: 'text-cyan',
}

export default function IdeathonPage() {
  const [selectedCompetition, setSelectedCompetition] = useState<number | null>(null)
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [competitionsLoading, setCompetitionsLoading] = useState(true)
  const [presentation, setPresentation] = useState<Presentation | null>(null)
  const [presentationLoading, setPresentationLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    api.get('/competitions').then((res) => {
      const d = res.data
      setCompetitions(Array.isArray(d) ? d : d.data ?? [])
    }).catch(() => {}).finally(() => setCompetitionsLoading(false))
  }, [])

  const competitionId = selectedCompetition ?? competitions[0]?.id ?? null

  useEffect(() => {
    if (!competitionId) { setPresentationLoading(false); return }
    setPresentationLoading(true)
    api.get('/ideathon/presentations/my?competition_id=' + competitionId)
      .then((res) => setPresentation(res.data))
      .catch(() => setPresentation(null))
      .finally(() => setPresentationLoading(false))
  }, [competitionId])

  const refreshPresentation = useCallback(async () => {
    if (!competitionId) return
    try {
      const res = await api.get('/ideathon/presentations/my?competition_id=' + competitionId)
      setPresentation(res.data)
    } catch { setPresentation(null) }
  }, [competitionId])

  if (competitionsLoading) {
    return <Layout><Spinner /></Layout>
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto animate-fade-in-up">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Ideathon
            </h1>
            <p className="text-sm text-silver-dim mt-1">Present your ideas and compete for the top spot</p>
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
          <EmptyState icon="&#x1F3C6;" title="No Competitions" desc="No competitions are available yet." />
        ) : presentationLoading ? (
          <Spinner />
        ) : !competitionId ? null : presentation === null && !showCreateForm ? (
          <div className="space-y-6">
            <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-6 text-center">
              <div className="w-14 h-14 bg-midnight-light/30 border border-midnight-lighter/40 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-cyan/60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>No Presentation Yet</h3>
              <p className="text-sm text-silver-dim/70 max-w-md mx-auto mb-5">Register your team's idea to participate in the ideathon round.</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-cyan/10 hover:bg-cyan/20 text-cyan border border-cyan/30 rounded-lg px-5 py-2.5 text-sm font-medium transition-all cursor-pointer"
              >
                Create Presentation
              </button>
            </div>
            <QueueAndResults competitionId={competitionId} />
          </div>
        ) : showCreateForm && !presentation ? (
          <div className="space-y-6">
            <CreatePresentationForm
              competitionId={competitionId}
              onSuccess={() => { setShowCreateForm(false); refreshPresentation() }}
              onCancel={() => setShowCreateForm(false)}
            />
            <QueueAndResults competitionId={competitionId} />
          </div>
        ) : presentation ? (
          <div className="space-y-6">
            <PresentationDetails presentation={presentation} onRefresh={refreshPresentation} />
            <QueueAndResults competitionId={competitionId} />
          </div>
        ) : null}
      </div>
    </Layout>
  )
}

function CreatePresentationForm({ competitionId, onSuccess, onCancel }: { competitionId: number; onSuccess: () => void; onCancel: () => void }) {
  const [problemStatement, setProblemStatement] = useState('')
  const [ideaSummary, setIdeaSummary] = useState('')
  const [theme, setTheme] = useState('')
  const [problemCategory, setProblemCategory] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!problemStatement.trim() || !ideaSummary.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      await api.post('/ideathon/presentations', {
        competition_id: competitionId,
        problem_statement: problemStatement,
        idea_summary: ideaSummary,
        theme: theme || null,
        problem_category: problemCategory || null,
      })
      onSuccess()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create presentation'
      setError(msg)
    }
    setSubmitting(false)
  }

  return (
    <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-6 animate-fade-in-up">
      <h2 className="text-lg font-bold text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>Register Your Idea</h2>
      <p className="text-xs text-silver-dim mb-5">Describe the problem your team is solving and your proposed solution</p>

      {error && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-3 mb-4">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-silver-dim mb-1.5 font-medium">Problem Statement *</label>
          <textarea
            value={problemStatement}
            onChange={(e) => setProblemStatement(e.target.value)}
            className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow h-24 resize-none"
            placeholder="Describe the problem your team aims to solve..."
            required
          />
        </div>
        <div>
          <label className="block text-xs text-silver-dim mb-1.5 font-medium">Idea Summary *</label>
          <textarea
            value={ideaSummary}
            onChange={(e) => setIdeaSummary(e.target.value)}
            className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow h-24 resize-none"
            placeholder="Summarize your proposed solution..."
            required
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-silver-dim mb-1.5 font-medium">Theme</label>
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow"
              placeholder="e.g. Sustainability, Health..."
            />
          </div>
          <div>
            <label className="block text-xs text-silver-dim mb-1.5 font-medium">Problem Category</label>
            <input
              type="text"
              value={problemCategory}
              onChange={(e) => setProblemCategory(e.target.value)}
              className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow"
              placeholder="e.g. Social, Technical..."
            />
          </div>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting || !problemStatement.trim() || !ideaSummary.trim()}
            className="bg-cyan/10 hover:bg-cyan/20 text-cyan border border-cyan/30 rounded-lg px-5 py-2.5 text-sm font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating...' : 'Register Idea'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-midnight-light/30 hover:bg-midnight-light/50 text-silver-dim hover:text-silver border border-midnight-lighter/40 rounded-lg px-5 py-2.5 text-sm font-medium transition-all cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

function PresentationDetails({ presentation, onRefresh }: { presentation: Presentation; onRefresh: () => void }) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [markingReady, setMarkingReady] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['pdf', 'ppt', 'pptx'].includes(ext ?? '')) {
      setUploadError('Only PDF, PPT, and PPTX files are accepted')
      return
    }
    setUploading(true)
    setUploadError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      await api.post('/ideathon/presentations/' + presentation.id + '/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onRefresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setUploadError(msg)
    }
    setUploading(false)
  }

  const handleMarkReady = async () => {
    setMarkingReady(true)
    try {
      await api.post('/ideathon/presentations/' + presentation.id + '/ready')
      onRefresh()
    } catch { /* ignored */ }
    setMarkingReady(false)
  }

  return (
    <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>Your Presentation</h2>
          <span className={'text-xs font-medium ' + (statusColor[presentation.status] ?? 'text-silver-dim')}>
            {presentation.status.charAt(0).toUpperCase() + presentation.status.slice(1)}
          </span>
        </div>
        {presentation.presentation_order && (
          <span className="text-xs text-silver-dim bg-midnight-light/30 border border-midnight-lighter/30 rounded-lg px-3 py-1">
            Order: <span className="text-white font-medium">#{presentation.presentation_order}</span>
          </span>
        )}
      </div>

      <div className="space-y-4 mb-5">
        <div>
          <p className="text-xs text-silver-dim mb-1 font-medium">Problem Statement</p>
          <p className="text-sm text-silver leading-relaxed bg-midnight-light/20 border border-midnight-lighter/30 rounded-lg px-4 py-3">{presentation.problem_statement}</p>
        </div>
        <div>
          <p className="text-xs text-silver-dim mb-1 font-medium">Idea Summary</p>
          <p className="text-sm text-silver leading-relaxed bg-midnight-light/20 border border-midnight-lighter/30 rounded-lg px-4 py-3">{presentation.idea_summary}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {presentation.theme && (
            <div>
              <p className="text-xs text-silver-dim mb-1 font-medium">Theme</p>
              <p className="text-sm text-silver">{presentation.theme}</p>
            </div>
          )}
          {presentation.problem_category && (
            <div>
              <p className="text-xs text-silver-dim mb-1 font-medium">Category</p>
              <p className="text-sm text-silver">{presentation.problem_category}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        {presentation.status === 'draft' && (
          <button
            onClick={handleMarkReady}
            disabled={markingReady}
            className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer disabled:opacity-40"
          >
            {markingReady ? 'Marking...' : 'Mark as Ready'}
          </button>
        )}
        <label className="bg-cyan/10 hover:bg-cyan/20 text-cyan border border-cyan/30 rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer inline-flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          {uploading ? 'Uploading...' : 'Upload File'}
          <input type="file" accept=".pdf,.ppt,.pptx" onChange={handleUpload} className="hidden" disabled={uploading} />
        </label>
      </div>
      {uploadError && (
        <p className="text-xs text-red-400 mb-2">{uploadError}</p>
      )}
      {presentation.file_url && (
        <div className="flex items-center gap-2 text-xs text-silver-dim">
          <svg className="w-3.5 h-3.5 text-cyan/60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          <a href={presentation.file_url} target="_blank" rel="noopener noreferrer" className="text-cyan hover:underline">View uploaded file</a>
        </div>
      )}
      {presentation.total_score !== null && (
        <div className="mt-4 bg-midnight-light/20 border border-midnight-lighter/30 rounded-lg px-4 py-3">
          <p className="text-xs text-silver-dim mb-0.5">Total Score</p>
          <p className="text-xl font-bold text-cyan" style={{ fontFamily: 'var(--font-display)' }}>{presentation.total_score}</p>
        </div>
      )}
    </div>
  )
}

function QueueAndResults({ competitionId }: { competitionId: number }) {
  const [queue, setQueue] = useState<QueueEntry[]>([])
  const [queueLoading, setQueueLoading] = useState(true)
  const [results, setResults] = useState<IdeathonResult[]>([])
  const [resultsLoading, setResultsLoading] = useState(true)

  useEffect(() => {
    api.get('/ideathon/competitions/' + competitionId + '/queue')
      .then((res) => {
        const d = res.data
        setQueue(Array.isArray(d) ? d : d.presentations ?? [])
      })
      .catch(() => {})
      .finally(() => setQueueLoading(false))

    api.get('/ideathon/competitions/' + competitionId + '/results')
      .then((res) => {
        const d = res.data
        setResults(Array.isArray(d) ? d : d.results ?? [])
      })
      .catch(() => {})
      .finally(() => setResultsLoading(false))
  }, [competitionId])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3" style={{ fontFamily: 'var(--font-display)' }}>Presentation Queue</h3>
        {queueLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-5 w-5 border-2 border-cyan/30 border-t-cyan rounded-full" />
          </div>
        ) : queue.length === 0 ? (
          <p className="text-xs text-silver-dim text-center py-8">No presentations in queue yet</p>
        ) : (
          <div className="space-y-2">
            {queue.map((entry) => (
              <div
                key={entry.team_id}
                className="flex items-center gap-3 bg-midnight-light/20 border border-midnight-lighter/30 rounded-lg px-4 py-3"
              >
                <span className="w-7 h-7 bg-midnight-light/40 border border-midnight-lighter/40 rounded-md flex items-center justify-center text-xs font-bold text-silver shrink-0">
                  {entry.presentation_order}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-silver font-medium truncate">{entry.team_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={'w-1.5 h-1.5 rounded-full ' + (entry.is_ready ? 'bg-green-400' : 'bg-silver-dim/40')} />
                  <span className={'text-[11px] ' + (entry.is_ready ? 'text-green-400' : 'text-silver-dim')}>
                    {entry.is_ready ? 'Ready' : 'Not Ready'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3" style={{ fontFamily: 'var(--font-display)' }}>Ideathon Results</h3>
        {resultsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-5 w-5 border-2 border-cyan/30 border-t-cyan rounded-full" />
          </div>
        ) : results.length === 0 ? (
          <p className="text-xs text-silver-dim text-center py-8">Results will appear after presentations are scored</p>
        ) : (
          <div className="space-y-2">
            {results.map((r) => (
              <div
                key={r.team_id}
                className="flex items-center gap-3 bg-midnight-light/20 border border-midnight-lighter/30 rounded-lg px-4 py-3"
              >
                <span className={'w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ' +
                  (r.rank === 1 ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                   r.rank === 2 ? 'bg-gray-300/10 text-gray-300 border border-gray-300/20' :
                   r.rank === 3 ? 'bg-amber-600/10 text-amber-600 border border-amber-600/20' :
                   'bg-midnight-light/40 text-silver-dim border border-midnight-lighter/40')
                }>
                  {r.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-silver font-medium truncate">{r.team_name}</p>
                  {r.presentation_order && (
                    <p className="text-[11px] text-silver-dim">Order #{r.presentation_order}</p>
                  )}
                </div>
                <span className="text-sm font-semibold text-cyan" style={{ fontFamily: 'var(--font-display)' }}>
                  {r.total_score}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
