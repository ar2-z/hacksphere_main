import { useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const roleBadgeColor: Record<string, string> = {
  super_admin: 'bg-accent-violet/15 text-accent-violet border-accent-violet/30',
  admin: 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30',
  team_leader: 'bg-frost/15 text-frost border-frost/30',
  team_member: 'bg-muted/15 text-muted border-muted/30',
}

export default function ProfilePage() {
  const { user, session } = useAuth()
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saveLoading, setSaveLoading] = useState(false)

  const startEditing = () => {
    setFullName(user?.full_name || '')
    setError('')
    setSuccess('')
    setEditing(true)
  }

  const cancelEditing = () => {
    setEditing(false)
    setError('')
    setSuccess('')
  }

  const handleSave = async () => {
    if (!user || !fullName.trim()) return
    setSaveLoading(true)
    setError('')
    setSuccess('')
    try {
      const { error: err } = await supabase
        .from('users')
        .update({ full_name: fullName.trim() })
        .eq('id', user.id)
      if (err) throw err
      setSuccess('Profile updated successfully')
      setEditing(false)
      window.location.reload()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Update failed'
      setError(msg)
    } finally {
      setSaveLoading(false)
    }
  }

  const initials = user?.full_name
    ?.split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'

  const roleLabel = user?.role?.replace(/_/g, ' ') || ''

  return (
    <Layout>
      <div className="space-y-8 max-w-3xl">
        <div className="flex items-center justify-between">
          <h1
            className="text-2xl font-bold text-white tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Profile
          </h1>
          {!editing && (
            <button
              onClick={startEditing}
              className="bg-accent-cyan/10 hover:bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30 rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer"
            >
              Edit Profile
            </button>
          )}
        </div>

        {!user ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full" />
          </div>
        ) : (
          <>
            <div className="bg-navy/40 border border-frost/10 rounded-xl p-6 animate-fade-in-up">
              <div className="flex items-center gap-5 mb-6 pb-6 border-b border-frost/10">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name}
                    className="w-16 h-16 rounded-2xl object-cover border border-frost/20 shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 bg-accent-violet/15 border border-accent-violet/30 rounded-2xl flex items-center justify-center shrink-0">
                    <span
                      className="text-2xl font-bold text-accent-violet"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {initials}
                    </span>
                  </div>
                )}
                <div>
                  <h2
                    className="text-lg font-bold text-white"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {user.full_name}
                  </h2>
                  <p className="text-sm text-muted">{user.email}</p>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 border rounded-md text-[11px] font-medium tracking-wider uppercase mt-1.5 ${
                      roleBadgeColor[user.role] || 'bg-muted/15 text-muted border-muted/30'
                    }`}
                  >
                    {roleLabel}
                  </span>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400 mb-4">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-accent-cyan/10 border border-accent-cyan/30 rounded-lg p-3 text-sm text-accent-cyan mb-4">
                  {success}
                </div>
              )}

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <label className="text-xs text-muted uppercase tracking-wider w-36 shrink-0 pt-2.5 sm:pt-0">
                    Full Name
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="flex-1 bg-frost/5 border border-frost/15 rounded-lg px-4 py-2.5 text-sm text-white placeholder-muted/50 focus:outline-none focus:border-accent-cyan/40"
                    />
                  ) : (
                    <div className="flex-1 px-4 py-2.5 text-sm text-white">
                      {user.full_name || <span className="text-muted/50">Not set</span>}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <label className="text-xs text-muted uppercase tracking-wider w-36 shrink-0 pt-2.5 sm:pt-0">
                    Email
                  </label>
                  <div className="flex-1 px-4 py-2.5 text-sm text-white">
                    {user.email}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <label className="text-xs text-muted uppercase tracking-wider w-36 shrink-0 pt-2.5 sm:pt-0">
                    Role
                  </label>
                  <div className="flex-1 px-4 py-2.5 text-sm text-white">
                    {roleLabel}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <label className="text-xs text-muted uppercase tracking-wider w-36 shrink-0 pt-2.5 sm:pt-0">
                    Member Since
                  </label>
                  <div className="flex-1 px-4 py-2.5 text-sm text-white">
                    {user.created_at
                      ? new Date(user.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : <span className="text-muted/50">Unknown</span>}
                  </div>
                </div>
              </div>

              {editing && (
                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-frost/10">
                  <button
                    onClick={cancelEditing}
                    className="bg-frost/5 hover:bg-frost/10 text-muted border border-frost/15 rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saveLoading || !fullName.trim()}
                    className="bg-accent-cyan/10 hover:bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30 rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {saveLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>

            <div className="bg-navy/40 border border-frost/10 rounded-xl p-6 animate-fade-in-up">
              <h3
                className="text-lg font-bold text-white mb-4"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Session
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Status</span>
                  <span className="text-accent-cyan font-medium">
                    {session ? 'Authenticated' : 'Not authenticated'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Last Updated</span>
                  <span className="text-white">
                    {user.updated_at
                      ? new Date(user.updated_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
