import { useState } from 'react'
import Layout from '../../components/Layout'
import api from '../../lib/api'
import { useFetch } from '../../lib/hooks'
import type { Competition } from '../../lib/types'

const statusOptions = [
  'draft',
  'registration',
  'active',
  'judging',
  'completed',
  'cancelled',
]

const statusColors: Record<string, string> = {
  draft: 'bg-silver/10 text-silver border border-silver/20',
  registration: 'bg-cyan/10 text-cyan border border-cyan/30',
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
  judging: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
  completed: 'bg-violet-500/10 text-violet-400 border border-violet-500/30',
  cancelled: 'bg-red-500/10 text-red-400 border border-red-500/30',
}

const phaseTypes = [
  'registration',
  'ideation',
  'development',
  'judging',
  'presentation',
]

interface CreateForm {
  name: string
  description: string
  theme: string
  max_teams: number
  team_min_size: number
  team_max_size: number
  registration_start: string
  registration_end: string
  event_start: string
  event_end: string
}

interface PhaseForm {
  phase_type: string
  name: string
  order: number
  starts_at: string
  ends_at: string
}

const defaultForm: CreateForm = {
  name: '',
  description: '',
  theme: '',
  max_teams: 50,
  team_min_size: 2,
  team_max_size: 5,
  registration_start: '',
  registration_end: '',
  event_start: '',
  event_end: '',
}

const defaultPhaseForm: PhaseForm = {
  phase_type: 'registration',
  name: '',
  order: 0,
  starts_at: '',
  ends_at: '',
}

export default function AdminCompetitionsPage() {
  const { data: competitions, loading, refetch } = useFetch<Competition[]>('/competitions/')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPhaseModal, setShowPhaseModal] = useState(false)
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<number | null>(null)
  const [form, setForm] = useState<CreateForm>(defaultForm)
  const [phaseForm, setPhaseForm] = useState<PhaseForm>(defaultPhaseForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusUpdating, setStatusUpdating] = useState<number | null>(null)

  const handleCreate = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await api.post('/competitions/', form)
      setShowCreateModal(false)
      setForm(defaultForm)
      refetch()
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to create competition')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (id: number, status: string) => {
    setStatusUpdating(id)
    try {
      await api.patch(`/competitions/${id}/status`, { status })
      refetch()
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to update status')
    } finally {
      setStatusUpdating(null)
    }
  }

  const handleAddPhase = async () => {
    if (!selectedCompetitionId) return
    setSubmitting(true)
    setError(null)
    try {
      await api.post(`/competitions/${selectedCompetitionId}/phases`, phaseForm)
      setShowPhaseModal(false)
      setPhaseForm(defaultPhaseForm)
      refetch()
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to add phase')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1
            className="text-2xl font-bold text-white tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Competitions
          </h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-cyan/10 hover:bg-cyan/20 text-cyan border border-cyan/30 rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer"
          >
            + Create Competition
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-cyan/30 border-t-cyan rounded-full" />
          </div>
        ) : competitions && competitions.length > 0 ? (
          <div className="animate-fade-in-up overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-silver-dim text-xs uppercase tracking-wider">
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Theme</th>
                  <th className="text-left py-3 px-4">Teams</th>
                  <th className="text-left py-3 px-4">Start</th>
                  <th className="text-left py-3 px-4">End</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {competitions.map((comp) => (
                  <tr key={comp.id} className="border-b border-midnight-lighter/20">
                    <td className="py-3 px-4 text-white font-medium">{comp.name}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[comp.status] || ''}`}
                      >
                        {comp.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-silver-dim">{comp.theme || '—'}</td>
                    <td className="py-3 px-4 text-silver">{comp.max_teams ?? 0}</td>
                    <td className="py-3 px-4 text-silver-dim">
                      {comp.event_start ? new Date(comp.event_start).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4 text-silver-dim">
                      {comp.event_end ? new Date(comp.event_end).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <select
                          value={comp.status}
                          disabled={statusUpdating === comp.id}
                          onChange={(e) => handleStatusChange(comp.id, e.target.value)}
                          className="bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-3 py-1.5 text-xs text-silver focus:outline-none focus:border-cyan/30 input-glow cursor-pointer"
                        >
                          {statusOptions.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => {
                            setSelectedCompetitionId(comp.id)
                            setPhaseForm({ ...defaultPhaseForm, order: comp.phases?.length || 0 })
                            setShowPhaseModal(true)
                          }}
                          className="bg-midnight-lighter/30 hover:bg-midnight-lighter/50 text-silver-dim border border-midnight-lighter/40 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer"
                        >
                          + Phase
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-12 text-center">
            <span className="text-4xl block mb-3">🏆</span>
            <p className="text-silver-dim">No competitions yet</p>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-midnight border border-midnight-lighter/40 rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto">
            <h2
              className="text-lg font-bold text-white mb-6"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Create Competition
            </h2>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-silver-dim mb-1.5">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Competition name"
                  className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow"
                />
              </div>
              <div>
                <label className="block text-xs text-silver-dim mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Competition description"
                  className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow resize-none min-h-[120px]"
                />
              </div>
              <div>
                <label className="block text-xs text-silver-dim mb-1.5">Theme</label>
                <input
                  type="text"
                  value={form.theme}
                  onChange={(e) => setForm({ ...form, theme: e.target.value })}
                  placeholder="e.g. AI for Social Good"
                  className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-silver-dim mb-1.5">Max Teams</label>
                  <input
                    type="number"
                    value={form.max_teams}
                    onChange={(e) => setForm({ ...form, max_teams: Number(e.target.value) })}
                    className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow"
                  />
                </div>
                <div>
                  <label className="block text-xs text-silver-dim mb-1.5">Min Size</label>
                  <input
                    type="number"
                    value={form.team_min_size}
                    onChange={(e) => setForm({ ...form, team_min_size: Number(e.target.value) })}
                    className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow"
                  />
                </div>
                <div>
                  <label className="block text-xs text-silver-dim mb-1.5">Max Size</label>
                  <input
                    type="number"
                    value={form.team_max_size}
                    onChange={(e) => setForm({ ...form, team_max_size: Number(e.target.value) })}
                    className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-silver-dim mb-1.5">Registration Start</label>
                  <input
                    type="datetime-local"
                    value={form.registration_start}
                    onChange={(e) => setForm({ ...form, registration_start: e.target.value })}
                    className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver focus:outline-none focus:border-cyan/30 input-glow"
                  />
                </div>
                <div>
                  <label className="block text-xs text-silver-dim mb-1.5">Registration End</label>
                  <input
                    type="datetime-local"
                    value={form.registration_end}
                    onChange={(e) => setForm({ ...form, registration_end: e.target.value })}
                    className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver focus:outline-none focus:border-cyan/30 input-glow"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-silver-dim mb-1.5">Event Start</label>
                  <input
                    type="datetime-local"
                    value={form.event_start}
                    onChange={(e) => setForm({ ...form, event_start: e.target.value })}
                    className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver focus:outline-none focus:border-cyan/30 input-glow"
                  />
                </div>
                <div>
                  <label className="block text-xs text-silver-dim mb-1.5">Event End</label>
                  <input
                    type="datetime-local"
                    value={form.event_end}
                    onChange={(e) => setForm({ ...form, event_end: e.target.value })}
                    className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver focus:outline-none focus:border-cyan/30 input-glow"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setForm(defaultForm)
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
                {submitting ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPhaseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-midnight border border-midnight-lighter/40 rounded-2xl p-6 max-w-lg w-full mx-4">
            <h2
              className="text-lg font-bold text-white mb-6"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Add Competition Phase
            </h2>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-silver-dim mb-1.5">Phase Type</label>
                <select
                  value={phaseForm.phase_type}
                  onChange={(e) => setPhaseForm({ ...phaseForm, phase_type: e.target.value })}
                  className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver focus:outline-none focus:border-cyan/30 input-glow"
                >
                  {phaseTypes.map((pt) => (
                    <option key={pt} value={pt}>
                      {pt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-silver-dim mb-1.5">Name</label>
                <input
                  type="text"
                  value={phaseForm.name}
                  onChange={(e) => setPhaseForm({ ...phaseForm, name: e.target.value })}
                  placeholder="Phase name"
                  className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow"
                />
              </div>
              <div>
                <label className="block text-xs text-silver-dim mb-1.5">Order</label>
                <input
                  type="number"
                  value={phaseForm.order}
                  onChange={(e) => setPhaseForm({ ...phaseForm, order: Number(e.target.value) })}
                  className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver focus:outline-none focus:border-cyan/30 input-glow"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-silver-dim mb-1.5">Starts At</label>
                  <input
                    type="datetime-local"
                    value={phaseForm.starts_at}
                    onChange={(e) => setPhaseForm({ ...phaseForm, starts_at: e.target.value })}
                    className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver focus:outline-none focus:border-cyan/30 input-glow"
                  />
                </div>
                <div>
                  <label className="block text-xs text-silver-dim mb-1.5">Ends At</label>
                  <input
                    type="datetime-local"
                    value={phaseForm.ends_at}
                    onChange={(e) => setPhaseForm({ ...phaseForm, ends_at: e.target.value })}
                    className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver focus:outline-none focus:border-cyan/30 input-glow"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPhaseModal(false)
                  setPhaseForm(defaultPhaseForm)
                  setError(null)
                }}
                className="bg-midnight-lighter/30 hover:bg-midnight-lighter/50 text-silver-dim border border-midnight-lighter/40 rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPhase}
                disabled={submitting || !phaseForm.name.trim()}
                className="bg-cyan/10 hover:bg-cyan/20 text-cyan border border-cyan/30 rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? 'Adding...' : 'Add Phase'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}