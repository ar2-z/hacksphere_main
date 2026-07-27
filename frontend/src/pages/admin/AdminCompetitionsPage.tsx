import { useState } from 'react'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabase'
import { useFetch } from '../../lib/hooks'
import type { Competition, CompetitionPhase } from '../../lib/types'

const phaseOptions: CompetitionPhase[] = ['quiz', 'debugging', 'ideathon', 'clues']

interface CompetitionForm {
  name: string
  description: string
  start_date: string
  end_date: string
  max_teams: number
  max_members_per_team: number
  current_phase: CompetitionPhase
  is_active: boolean
}

const defaultForm: CompetitionForm = {
  name: '',
  description: '',
  start_date: '',
  end_date: '',
  max_teams: 50,
  max_members_per_team: 5,
  current_phase: 'quiz',
  is_active: true,
}

export default function AdminCompetitionsPage() {
  const { data: competitions, loading, refetch } = useFetch<Competition[]>(
    'competitions',
    { order: { column: 'created_at', ascending: false } }
  )
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CompetitionForm>(defaultForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openCreate = () => {
    setEditingId(null)
    setForm(defaultForm)
    setError(null)
    setShowModal(true)
  }

  const openEdit = (comp: Competition) => {
    setEditingId(comp.id)
    setForm({
      name: comp.name,
      description: comp.description ?? '',
      start_date: comp.start_date ? comp.start_date.slice(0, 16) : '',
      end_date: comp.end_date ? comp.end_date.slice(0, 16) : '',
      max_teams: comp.max_teams,
      max_members_per_team: comp.max_members_per_team,
      current_phase: comp.current_phase,
      is_active: comp.is_active,
    })
    setError(null)
    setShowModal(true)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        max_teams: form.max_teams,
        max_members_per_team: form.max_members_per_team,
        current_phase: form.current_phase,
        is_active: form.is_active,
      }
      if (editingId) {
        const { error: err } = await supabase
          .from('competitions')
          .update(payload)
          .eq('id', editingId)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from('competitions').insert(payload)
        if (err) throw err
      }
      setShowModal(false)
      setEditingId(null)
      setForm(defaultForm)
      refetch()
    } catch (err: any) {
      setError(err?.message || 'Failed to save competition')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this competition?')) return
    const { error: err } = await supabase.from('competitions').delete().eq('id', id)
    if (err) {
      alert(err.message)
    } else {
      refetch()
    }
  }

  const toggleActive = async (comp: Competition) => {
    const { error: err } = await supabase
      .from('competitions')
      .update({ is_active: !comp.is_active })
      .eq('id', comp.id)
    if (!err) refetch()
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1
            className="text-2xl font-bold text-frost tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Competitions
          </h1>
          <button
            onClick={openCreate}
            className="bg-gradient-to-r from-accent-violet to-accent-cyan text-void font-semibold rounded-xl px-5 py-2.5 text-sm cursor-pointer"
          >
            Create Competition
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-accent-violet/30 border-t-accent-violet rounded-full" />
          </div>
        ) : competitions && competitions.length > 0 ? (
          <div className="bg-navy/40 border border-navy-border/40 rounded-xl p-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-frost-dim text-xs uppercase tracking-wider">
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">Phase</th>
                  <th className="text-left py-3 px-4">Max Teams</th>
                  <th className="text-left py-3 px-4">Max Members</th>
                  <th className="text-left py-3 px-4">Active</th>
                  <th className="text-left py-3 px-4">Start</th>
                  <th className="text-left py-3 px-4">End</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {competitions.map((comp) => (
                  <tr key={comp.id} className="border-b border-navy-border/20">
                    <td className="py-3 px-4 text-frost font-medium">{comp.name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-accent-violet/10 text-accent-violet border border-accent-violet/30">
                        {comp.current_phase}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-frost-dim">{comp.max_teams}</td>
                    <td className="py-3 px-4 text-frost-dim">{comp.max_members_per_team}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => toggleActive(comp)}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                          comp.is_active
                            ? 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30'
                            : 'bg-muted/10 text-muted border border-muted/30'
                        }`}
                      >
                        {comp.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-frost-dim text-xs">
                      {comp.start_date ? new Date(comp.start_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4 text-frost-dim text-xs">
                      {comp.end_date ? new Date(comp.end_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(comp)}
                          className="bg-navy-lighter/60 hover:bg-navy-lighter/80 text-frost-dim border border-navy-border/40 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(comp.id)}
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
            <p className="text-frost-dim">No competitions yet</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-void/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-navy border border-navy-border/40 rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto">
            <h2
              className="text-lg font-bold text-frost mb-6"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {editingId ? 'Edit Competition' : 'Create Competition'}
            </h2>

            {error && (
              <div className="bg-accent-pink/10 border border-accent-pink/30 rounded-xl p-3 mb-4 text-sm text-accent-pink">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-frost-dim mb-1.5">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Competition name"
                  className="w-full bg-void/60 border border-navy-lighter/60 rounded-xl px-4 py-2.5 text-sm text-frost placeholder-muted/30 focus:outline-none input-glow"
                />
              </div>
              <div>
                <label className="block text-xs text-frost-dim mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Competition description"
                  className="w-full bg-void/60 border border-navy-lighter/60 rounded-xl px-4 py-2.5 text-sm text-frost placeholder-muted/30 focus:outline-none input-glow resize-none min-h-[100px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-frost-dim mb-1.5">Start Date</label>
                  <input
                    type="datetime-local"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full bg-void/60 border border-navy-lighter/60 rounded-xl px-4 py-2.5 text-sm text-frost focus:outline-none input-glow"
                  />
                </div>
                <div>
                  <label className="block text-xs text-frost-dim mb-1.5">End Date</label>
                  <input
                    type="datetime-local"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full bg-void/60 border border-navy-lighter/60 rounded-xl px-4 py-2.5 text-sm text-frost focus:outline-none input-glow"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-frost-dim mb-1.5">Max Teams</label>
                  <input
                    type="number"
                    value={form.max_teams}
                    onChange={(e) => setForm({ ...form, max_teams: Number(e.target.value) })}
                    className="w-full bg-void/60 border border-navy-lighter/60 rounded-xl px-4 py-2.5 text-sm text-frost placeholder-muted/30 focus:outline-none input-glow"
                  />
                </div>
                <div>
                  <label className="block text-xs text-frost-dim mb-1.5">Max Members Per Team</label>
                  <input
                    type="number"
                    value={form.max_members_per_team}
                    onChange={(e) =>
                      setForm({ ...form, max_members_per_team: Number(e.target.value) })
                    }
                    className="w-full bg-void/60 border border-navy-lighter/60 rounded-xl px-4 py-2.5 text-sm text-frost placeholder-muted/30 focus:outline-none input-glow"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-frost-dim mb-1.5">Current Phase</label>
                <select
                  value={form.current_phase}
                  onChange={(e) =>
                    setForm({ ...form, current_phase: e.target.value as CompetitionPhase })
                  }
                  className="w-full bg-void/60 border border-navy-lighter/60 rounded-xl px-4 py-2.5 text-sm text-frost focus:outline-none input-glow"
                >
                  {phaseOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
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
                disabled={submitting || !form.name.trim()}
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
