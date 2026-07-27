import { useState } from 'react'
import Layout from '../../components/Layout'
import { useFetch } from '../../lib/hooks'
import api from '../../lib/api'
import type { Competition, Violation } from '../../lib/types'

interface ViolationStats {
  competition_id: string
  total_violations: number
  by_type: Record<string, number>
  by_severity: Record<number, number>
  by_action: Record<string, number>
}

const severityLabels: Record<number, string> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
  4: 'Critical',
}

const severityColors: Record<number, string> = {
  1: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  2: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  3: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  4: 'bg-red-500/10 text-red-400 border border-red-500/20',
}

export default function AdminViolationsPage() {
  const [competitionId, setCompetitionId] = useState<string>('')
  const { data: competitions } = useFetch<Competition[]>('/competitions/')
  const { data: violations, loading, refetch } = useFetch<Violation[]>(
    competitionId ? `/violations/competition/${competitionId}/list` : null,
    [competitionId]
  )
  const { data: stats } = useFetch<ViolationStats>(
    competitionId ? `/violations/competition/${competitionId}` : null,
    [competitionId]
  )
  const [actionModal, setActionModal] = useState<{ violationId: string; type: 'action' } | null>(null)
  const [actionForm, setActionForm] = useState({ action_taken: '', reason: '' })
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleAction = async () => {
    if (!actionModal) return
    setActionLoading(true)
    setError('')
    setSuccess('')
    try {
      await api.post(`/violations/${actionModal.violationId}/action`, {
        action_taken: actionForm.action_taken,
        reason: actionForm.reason || null,
      })
      setSuccess('Action recorded successfully')
      setActionModal(null)
      setActionForm({ action_taken: '', reason: '' })
      refetch()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed'
      setError(msg)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Violations Management
          </h1>
        </div>

        <div className="flex items-center gap-4">
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
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">{error}</div>
        )}
        {success && (
          <div className="bg-cyan/10 border border-cyan/30 rounded-lg p-3 text-sm text-cyan">{success}</div>
        )}

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fade-in-up">
            <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-4">
              <p className="text-xs text-silver-dim uppercase tracking-wider mb-1">Total</p>
              <p className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>{stats.total_violations}</p>
            </div>
            {Object.entries(stats.by_severity || {}).map(([sev, count]) => {
              const sevNum = parseInt(sev)
              return (
                <div key={sev} className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-4">
                  <p className="text-xs text-silver-dim uppercase tracking-wider mb-1">{severityLabels[sevNum] || sev}</p>
                  <p className={`text-2xl font-bold ${sevNum >= 4 ? 'text-red-400' : sevNum === 3 ? 'text-orange-400' : sevNum === 2 ? 'text-yellow-400' : 'text-blue-400'}`} style={{ fontFamily: 'var(--font-display)' }}>{count}</p>
                </div>
              )
            })}
          </div>
        )}

        {!competitionId ? (
          <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-12 text-center animate-fade-in-up">
            <div className="w-16 h-16 bg-midnight-light/30 border border-midnight-lighter/40 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-silver-dim/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              Select a Competition
            </h3>
            <p className="text-sm text-silver-dim/70 max-w-md mx-auto">
              Choose a competition above to view and manage rule violations.
            </p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-cyan/30 border-t-cyan rounded-full" />
          </div>
        ) : violations && violations.length > 0 ? (
          <div className="animate-fade-in-up">
            <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-midnight-lighter/30">
                    <th className="text-left px-5 py-3.5 text-silver-dim text-xs uppercase tracking-wider font-medium">User ID</th>
                    <th className="text-left px-5 py-3.5 text-silver-dim text-xs uppercase tracking-wider font-medium">Type</th>
                    <th className="text-left px-5 py-3.5 text-silver-dim text-xs uppercase tracking-wider font-medium">Severity</th>
                    <th className="text-left px-5 py-3.5 text-silver-dim text-xs uppercase tracking-wider font-medium">Description</th>
                    <th className="text-left px-5 py-3.5 text-silver-dim text-xs uppercase tracking-wider font-medium">Action Taken</th>
                    <th className="text-left px-5 py-3.5 text-silver-dim text-xs uppercase tracking-wider font-medium">Date</th>
                    <th className="text-left px-5 py-3.5 text-silver-dim text-xs uppercase tracking-wider font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {violations.map((v) => (
                    <tr key={v.id} className="border-b border-midnight-lighter/20 hover:bg-midnight-light/20 transition-colors">
                      <td className="px-5 py-4 text-silver">{v.user_id || '---'}</td>
                      <td className="px-5 py-4">
                        <span className="text-silver capitalize">{v.violation_type.replace('_', ' ')}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${severityColors[v.severity] || severityColors[1]}`}>
                          {severityLabels[v.severity] || v.severity}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-silver-dim text-xs max-w-xs block truncate">{v.description || '---'}</span>
                      </td>
                      <td className="px-5 py-4">
                        {v.action_taken ? (
                          <span className="text-xs text-silver-dim max-w-[120px] block truncate" title={v.action_taken}>
                            {v.action_taken}
                          </span>
                        ) : (
                          <span className="text-xs text-silver-dim/50">---</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-silver-dim text-xs whitespace-nowrap">
                        {new Date(v.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => setActionModal({ violationId: v.id, type: 'action' })}
                          className="bg-cyan/10 hover:bg-cyan/20 text-cyan border border-cyan/30 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer"
                        >
                          Take Action
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-12 text-center">
            <svg className="w-10 h-10 text-silver-dim/30 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-silver-dim">No violations recorded for this competition</p>
          </div>
        )}
      </div>

      {actionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-midnight border border-midnight-lighter/40 rounded-2xl p-6 w-full max-w-md animate-fade-in-up">
            <h3 className="text-lg font-bold text-white mb-5" style={{ fontFamily: 'var(--font-display)' }}>
              Take Action on Violation
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-silver-dim mb-1.5 tracking-wider uppercase">Action Taken</label>
                <input
                  type="text"
                  value={actionForm.action_taken}
                  onChange={(e) => setActionForm((f) => ({ ...f, action_taken: e.target.value }))}
                  placeholder="e.g. Warning issued, Team disqualified"
                  className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-silver-dim mb-1.5 tracking-wider uppercase">Reason (Optional)</label>
                <textarea
                  value={actionForm.reason}
                  onChange={(e) => setActionForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="Explain why this action is being taken..."
                  className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow resize-none min-h-[120px]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setActionModal(null); setActionForm({ action_taken: '', reason: '' }) }}
                className="bg-midnight-light/40 hover:bg-midnight-light/60 text-silver border border-midnight-lighter/40 rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={actionLoading || !actionForm.action_taken}
                className="bg-cyan/10 hover:bg-cyan/20 text-cyan border border-cyan/30 rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Processing...' : 'Submit Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
