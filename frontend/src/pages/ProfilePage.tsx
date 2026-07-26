import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { useFetch } from '../lib/hooks'
import api from '../lib/api'
import type { User } from '../lib/types'

export default function ProfilePage() {
  const { data: user, loading, refetch } = useFetch<User>('/auth/me')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    username: '',
    phone: '',
    college: '',
    department: '',
    year_of_study: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saveLoading, setSaveLoading] = useState(false)

  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '' })
  const [pwLoading, setPwLoading] = useState(false)
  const [pwSuccess, setPwSuccess] = useState('')
  const [pwError, setPwError] = useState('')

  useEffect(() => {
    if (user) {
      setForm({
        full_name: user.full_name || '',
        email: user.email || '',
        username: user.username || '',
        phone: user.phone || '',
        college: user.college || '',
        department: user.department || '',
        year_of_study: user.year_of_study || '',
      })
    }
  }, [user])

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!user) return
    setSaveLoading(true)
    setError('')
    setSuccess('')
    try {
      await api.put(`/users/${user.id}`, form)
      setSuccess('Profile updated successfully')
      setEditing(false)
      refetch()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Update failed'
      setError(msg)
    } finally {
      setSaveLoading(false)
    }
  }

  const handleChangePassword = async () => {
    setPwLoading(true)
    setPwError('')
    setPwSuccess('')
    try {
      await api.post('/auth/change-password', pwForm)
      setPwSuccess('Password changed successfully')
      setPwForm({ current_password: '', new_password: '' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Password change failed'
      setPwError(msg)
    } finally {
      setPwLoading(false)
    }
  }

  const profileFields = [
    { key: 'full_name', label: 'Full Name', editable: true },
    { key: 'email', label: 'Email', editable: false },
    { key: 'username', label: 'Username', editable: true },
    { key: 'role', label: 'Role', editable: false },
    { key: 'phone', label: 'Phone', editable: true },
    { key: 'college', label: 'College', editable: true },
    { key: 'department', label: 'Department', editable: true },
    { key: 'year_of_study', label: 'Year of Study', editable: true },
  ] as const

  return (
    <Layout>
      <div className="space-y-8 max-w-3xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Profile
          </h1>
          {!editing && (
            <button
              onClick={() => { setEditing(true); setError(''); setSuccess('') }}
              className="bg-cyan/10 hover:bg-cyan/20 text-cyan border border-cyan/30 rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer"
            >
              Edit Profile
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-cyan/30 border-t-cyan rounded-full" />
          </div>
        ) : user ? (
          <>
            <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-6 animate-fade-in-up">
              <div className="flex items-center gap-5 mb-6 pb-6 border-b border-midnight-lighter/30">
                <div className="w-16 h-16 bg-cyan/10 border border-cyan/30 rounded-2xl flex items-center justify-center shrink-0">
                  <span className="text-2xl font-bold text-cyan" style={{ fontFamily: 'var(--font-display)' }}>
                    {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>{user.full_name}</h2>
                  <p className="text-sm text-silver-dim">@{user.username}</p>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan/5 border border-cyan/20 rounded-md text-[10px] font-medium text-cyan/80 tracking-wider uppercase mt-1">
                    {user.role?.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400 mb-4">{error}</div>
              )}
              {success && (
                <div className="bg-cyan/10 border border-cyan/30 rounded-lg p-3 text-sm text-cyan mb-4">{success}</div>
              )}

              <div className="space-y-4">
                {profileFields.map((field) => (
                  <div key={field.key} className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <label className="text-xs text-silver-dim uppercase tracking-wider w-36 shrink-0 pt-2.5 sm:pt-0">
                      {field.label}
                    </label>
                    {editing && field.editable ? (
                      <input
                        type="text"
                        value={form[field.key] || ''}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        className="flex-1 bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow"
                      />
                    ) : (
                      <div className="flex-1 px-4 py-2.5 text-sm text-silver">
                        {user[field.key] || <span className="text-silver-dim/50">Not set</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {editing && (
                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-midnight-lighter/30">
                  <button
                    onClick={() => { setEditing(false); setError(''); setSuccess(''); if (user) {
                      setForm({
                        full_name: user.full_name || '',
                        email: user.email || '',
                        username: user.username || '',
                        phone: user.phone || '',
                        college: user.college || '',
                        department: user.department || '',
                        year_of_study: user.year_of_study || '',
                      })
                    }}}
                    className="bg-midnight-light/40 hover:bg-midnight-light/60 text-silver border border-midnight-lighter/40 rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saveLoading}
                    className="bg-cyan/10 hover:bg-cyan/20 text-cyan border border-cyan/30 rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {saveLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>

            <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-6 animate-fade-in-up">
              <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                Change Password
              </h3>

              {pwError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400 mb-4">{pwError}</div>
              )}
              {pwSuccess && (
                <div className="bg-cyan/10 border border-cyan/30 rounded-lg p-3 text-sm text-cyan mb-4">{pwSuccess}</div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-silver-dim mb-1.5 tracking-wider uppercase">Current Password</label>
                  <input
                    type="password"
                    value={pwForm.current_password}
                    onChange={(e) => setPwForm((p) => ({ ...p, current_password: e.target.value }))}
                    placeholder="Enter current password"
                    className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-silver-dim mb-1.5 tracking-wider uppercase">New Password</label>
                  <input
                    type="password"
                    value={pwForm.new_password}
                    onChange={(e) => setPwForm((p) => ({ ...p, new_password: e.target.value }))}
                    placeholder="Enter new password"
                    className="w-full bg-deep-black/60 border border-midnight-lighter/60 rounded-lg px-4 py-2.5 text-sm text-silver placeholder-silver-dim/50 focus:outline-none focus:border-cyan/30 input-glow"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={handleChangePassword}
                  disabled={pwLoading || !pwForm.current_password || !pwForm.new_password}
                  className="bg-cyan/10 hover:bg-cyan/20 text-cyan border border-cyan/30 rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {pwLoading ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-midnight/40 border border-midnight-lighter/40 rounded-xl p-12 text-center">
            <span className="text-4xl block mb-3">👤</span>
            <p className="text-silver-dim">Could not load profile</p>
          </div>
        )}
      </div>
    </Layout>
  )
}
