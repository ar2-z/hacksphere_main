import { useState } from 'react'
import Layout from '../../components/Layout'
import { useFetch } from '../../lib/hooks'
import api from '../../lib/api'
import type { Competition, Announcement } from '../../lib/types'

const priorityColors: Record<string, string> = {
  low: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  medium: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  high: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  critical: 'bg-red-500/10 text-red-400 border border-red-500/20',
}

interface AnnouncementForm {
  title: string
  content: string
  priority: string
  is_pinned: boolean
  is_broadcast: boolean
  target_team_id: string
}

const emptyForm: AnnouncementForm = {
  title: '',
  content: '',
  priority: 'medium',
  is_pinned: false,
  is_broadcast: true,
  target_team_id: '',
}

export default function AdminAnnouncementsPage() {
  const [competitionId, setCompetitionId] = useState<string>('')
  const { data: competitions } = useFetch<Competition[]>('/competitions/')
  const { data: announcements, loading, refetch } = useFetch<Announcement[]>(
    competitionId ? `/admin/announcements/${competitionId}` : null,
    [competitionId]
  )
  const [form, setForm] = useState<AnnouncementForm>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const updateField = (field: keyof AnnouncementForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(false)
  }

  const handleSubmit = async () => {
    if (!competitionId || !form.title || !form.content) return
    setSubmitLoading(true)
    setError('')
    setSuccess('')
    try {
      const payload = {
        title: form.title,
        content: form.content,
        priority: form.priority,
        is_pinned: form.is_pinned,
        is_broadcast: form.is_broadcast,
        target_team_id: form.target_team_id ? parseInt(form.target_team_id) : null,
      }

      if (editingId) {
        await api.put(`/admin/announcements/${editingId}`, payload)
        setSuccess('Announcement updated successfully')
      } else {
        await api.post('/admin/announcements', { ...payload, competition_id: parseInt(competitionId) })
        setSuccess('Announcement created successfully')
      }
      resetForm()
      refetch()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Operation failed'
      setError(msg)
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleEdit = (a: Announcement) => {
    setForm({
      title: a.title,
      content: a.content,
      priority: a.priority,
      is_pinned: a.is_pinned,
      is_broadcast: a.is_broadcast,
      target_team_id: a.target_team_id?.toString() || '',
    })
    setEditingId(a.id)
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this announcement?')) return
    setError('')
    setSuccess('')
    try {
      await api.delete(`/admin/announcements/${id}`)
      setSuccess('Announcement deleted')
      refetch()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed'
      setError(msg)
    }
  }

  const sorted = announcements
    ? [...announcements].sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
    : []

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Announcements
          </h1>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <label className="text-sm text-silver-dim">Select Competition</label>
          <select
            value={competitionId}
            onChange={(e) => { setCompetitionId(e.target.value); resetForm() }}
            className="bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver focus:outline-none focus:border-cyan/30 input-glow appearance-none"
          >
            <option value="">Choose a competition</option>
            {competitions?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {competitionId && !showForm && (
            <button
              onClick={() => { resetForm(); setShowForm(true) }}
              className="bg-cyan/10 hover:bg-cyan/20 text-cyan border border-cyan/30 rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer"
            >
              New Announcement
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">{error}</div>
        )}
        {success && (
          <div className="bg-cyan/10 border border-cyan/30 rounded-lg p-3 text-sm text-cyan">{success}</div>
        )}

        {showForm && competitionId && (
          <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-6 animate-fade-in-up">
            <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              {editingId ? 'Edit Announcement' : 'New Announcement'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-silver-dim mb-1.5 tracking-wider uppercase">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="Announcement title"
                  className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-silver-dim mb-1.5 tracking-wider uppercase">Content</label>
                <textarea
                  value={form.content}
                  onChange={(e) => updateField('content', e.target.value)}
                  placeholder="Write the announcement content..."
                  className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow resize-none min-h-[120px]"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-silver-dim mb-1.5 tracking-wider uppercase">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => updateField('priority', e.target.value)}
                    className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver focus:outline-none focus:border-cyan/30 input-glow appearance-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-silver-dim mb-1.5 tracking-wider uppercase">Target Team ID (Optional)</label>
                  <input
                    type="number"
                    value={form.target_team_id}
                    onChange={(e) => updateField('target_team_id', e.target.value)}
                    placeholder="Leave empty for broadcast"
                    className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow"
                  />
                </div>
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_pinned}
                      onChange={(e) => updateField('is_pinned', e.target.checked)}
                      className="w-4 h-4 rounded border-midnight-lighter bg-deep-black/60 text-cyan focus:ring-cyan/30"
                    />
                    <span className="text-sm text-silver">Pinned</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_broadcast}
                      onChange={(e) => updateField('is_broadcast', e.target.checked)}
                      className="w-4 h-4 rounded border-midnight-lighter bg-deep-black/60 text-cyan focus:ring-cyan/30"
                    />
                    <span className="text-sm text-silver">Broadcast</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={resetForm}
                className="bg-midnight-light/40 hover:bg-midnight-light/60 text-silver border border-midnight-lighter/40 rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitLoading || !form.title || !form.content}
                className="bg-cyan/10 hover:bg-cyan/20 text-cyan border border-cyan/30 rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitLoading ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        )}

        {!competitionId ? (
          <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-12 text-center animate-fade-in-up">
            <div className="w-16 h-16 bg-midnight-light/30 border border-midnight-lighter/40 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-silver-dim/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              Select a Competition
            </h3>
            <p className="text-sm text-silver-dim/70 max-w-md mx-auto">
              Choose a competition above to manage announcements for participants.
            </p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-cyan/30 border-t-cyan rounded-full" />
          </div>
        ) : sorted.length > 0 ? (
          <div className="space-y-3 animate-fade-in-up">
            {sorted.map((a) => (
              <div key={a.id} className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-5 hover:border-midnight-lighter/60 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {a.is_pinned && (
                        <svg className="w-3.5 h-3.5 text-cyan shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                        </svg>
                      )}
                      <h3 className="text-sm font-semibold text-white">{a.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[a.priority] || priorityColors.medium}`}>
                        {a.priority}
                      </span>
                      {a.is_broadcast && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-cyan/10 text-cyan border border-cyan/20">
                          Broadcast
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-silver-dim leading-relaxed">{a.content}</p>
                    <p className="text-xs text-silver-dim/60">
                      {new Date(a.created_at).toLocaleString()}
                      {a.target_team_id ? ` · Team #${a.target_team_id}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleEdit(a)}
                      className="bg-midnight-light/40 hover:bg-midnight-light/60 text-silver border border-midnight-lighter/40 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-12 text-center">
            <span className="text-4xl block mb-3">📢</span>
            <p className="text-silver-dim">No announcements yet</p>
          </div>
        )}
      </div>
    </Layout>
  )
}
