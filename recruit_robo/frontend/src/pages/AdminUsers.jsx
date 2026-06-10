import { useState, useEffect } from 'react'
import { authApi } from '../api'
import { useAuth } from '../context/AuthContext'
import {
  Users, UserPlus, Trash2, ShieldCheck, Eye, AlertCircle,
  CheckCircle, X, ChevronDown,
} from 'lucide-react'
import QlogoLoader from '../components/QlogoLoader'

const ROLES = ['admin', 'editor', 'viewer']

const ROLE_STYLE = {
  admin:     { badge: 'bg-purple-100 text-purple-700', label: 'Admin' },
  editor:    { badge: 'bg-blue-100 text-blue-700',     label: 'Editor' },
  recruiter: { badge: 'bg-blue-100 text-blue-700',     label: 'Editor' },
  viewer:    { badge: 'bg-gray-100 text-gray-600',     label: 'Viewer' },
}

const INPUT = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition'
const SELECT = INPUT

function RoleBadge({ role }) {
  const s = ROLE_STYLE[role] || ROLE_STYLE.viewer
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${s.badge}`}>{s.label}</span>
}

function StatusBadge({ active }) {
  return active
    ? <span className="flex items-center gap-1 text-xs font-medium text-emerald-600"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"/>Active</span>
    : <span className="flex items-center gap-1 text-xs font-medium text-gray-400"><span className="w-1.5 h-1.5 bg-gray-300 rounded-full"/>Suspended</span>
}

export default function AdminUsers() {
  const { user: me } = useAuth()

  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const [showInvite, setShowInvite] = useState(false)
  const [invite,     setInvite]     = useState({ name: '', email: '', password: '', role: 'viewer' })
  const [inviting,   setInviting]   = useState(false)
  const [inviteMsg,  setInviteMsg]  = useState(null)

  const [actionMsg,  setActionMsg]  = useState(null)

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    setLoading(true); setError(null)
    try {
      const r = await authApi.users()
      setUsers(r.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load users.')
    } finally { setLoading(false) }
  }

  async function handleInvite(e) {
    e.preventDefault()
    setInviting(true); setInviteMsg(null)
    try {
      const r = await authApi.inviteUser(invite)
      setUsers(prev => [...prev, r.data])
      setInvite({ name: '', email: '', password: '', role: 'viewer' })
      setShowInvite(false)
      setActionMsg({ ok: true, text: `${r.data.name} invited as ${r.data.role}.` })
    } catch (err) {
      setInviteMsg({ ok: false, text: err.response?.data?.detail || 'Failed to invite user.' })
    } finally { setInviting(false) }
  }

  async function handleRoleChange(userId, newRole) {
    try {
      const r = await authApi.updateUser(userId, { role: newRole })
      setUsers(prev => prev.map(u => u.userId === userId ? r.data : u))
      setActionMsg({ ok: true, text: 'Role updated.' })
    } catch (err) {
      setActionMsg({ ok: false, text: err.response?.data?.detail || 'Failed to update role.' })
    }
  }

  async function handleToggleActive(userId, currentActive) {
    try {
      const r = await authApi.updateUser(userId, { is_active: !currentActive })
      setUsers(prev => prev.map(u => u.userId === userId ? r.data : u))
      setActionMsg({ ok: true, text: currentActive ? 'User suspended.' : 'User activated.' })
    } catch (err) {
      setActionMsg({ ok: false, text: err.response?.data?.detail || 'Failed to update status.' })
    }
  }

  async function handleDelete(userId, name) {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return
    try {
      await authApi.deleteUser(userId)
      setUsers(prev => prev.filter(u => u.userId !== userId))
      setActionMsg({ ok: true, text: `${name} deleted.` })
    } catch (err) {
      setActionMsg({ ok: false, text: err.response?.data?.detail || 'Failed to delete user.' })
    }
  }

  return (
    <div className="px-6 py-5 w-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <ShieldCheck className="w-5 h-5 text-purple-500" />
            <h1 className="text-xl font-semibold text-gray-900">Access Management</h1>
          </div>
          <p className="text-sm text-gray-400">Manage team members and their access roles</p>
        </div>
        <button
          onClick={() => { setShowInvite(true); setInviteMsg(null) }}
          className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-medium rounded-xl shadow-sm hover:shadow-md transition-all"
          style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
          <UserPlus className="w-4 h-4" /> Invite Member
        </button>
      </div>

      {/* Action flash message */}
      {actionMsg && (
        <div className={`flex items-center gap-2 mb-4 px-4 py-2.5 rounded-xl text-sm ${
          actionMsg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
        }`}>
          {actionMsg.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {actionMsg.text}
          <button onClick={() => setActionMsg(null)} className="ml-auto">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Role guide */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { role: 'admin',  icon: ShieldCheck, desc: 'Full access — can manage users, jobs, candidates', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100' },
          { role: 'editor', icon: Users,        desc: 'Can create and edit jobs, candidates and pipeline', color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-100' },
          { role: 'viewer', icon: Eye,          desc: 'Read-only — can view all data but cannot edit',    color: 'text-gray-500',   bg: 'bg-gray-50 border-gray-100' },
        ].map(({ role, icon: Icon, desc, color, bg }) => (
          <div key={role} className={`border rounded-xl p-3 ${bg}`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className={`text-xs font-semibold capitalize ${color}`}>{role}</span>
            </div>
            <p className="text-xs text-gray-500">{desc}</p>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/40 flex items-center justify-between">
          <p className="text-sm font-bold text-gray-800">
            Team Members <span className="text-gray-400 font-normal">({users.length})</span>
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <QlogoLoader size={48} label="Loading users…" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 px-5 py-8 text-red-500 text-sm">
            <AlertCircle className="w-4 h-4" />{error}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No team members yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/40">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Member</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Joined</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(u => {
                  const isMe   = u.userId === me?.userId
                  const joined = u.created_at
                    ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—'
                  return (
                    <tr key={u.userId} className="hover:bg-gray-50/60 transition-colors">
                      {/* Member */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
                            {u.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 text-sm">
                              {u.name}
                              {isMe && <span className="ml-1.5 text-[10px] text-purple-500 font-semibold">(you)</span>}
                            </p>
                            <p className="text-xs text-gray-400">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3.5">
                        {isMe ? (
                          <RoleBadge role={u.role} />
                        ) : (
                          <div className="relative inline-block">
                            <select
                              value={u.role === 'recruiter' ? 'editor' : u.role}
                              onChange={e => handleRoleChange(u.userId, e.target.value)}
                              className="appearance-none pl-2.5 pr-7 py-1 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer">
                              {ROLES.map(r => (
                                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                              ))}
                            </select>
                            <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <StatusBadge active={u.is_active !== false} />
                      </td>

                      {/* Joined */}
                      <td className="px-4 py-3.5 text-xs text-gray-400">{joined}</td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        {!isMe && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleActive(u.userId, u.is_active !== false)}
                              title={u.is_active !== false ? 'Suspend' : 'Activate'}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                                u.is_active !== false
                                  ? 'border-amber-200 text-amber-600 hover:bg-amber-50'
                                  : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                              }`}>
                              {u.is_active !== false ? 'Suspend' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleDelete(u.userId, u.name)}
                              title="Delete user"
                              className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <p className="text-base font-semibold text-gray-900">Invite Team Member</p>
                <p className="text-xs text-gray-400 mt-0.5">Create an account and assign a role</p>
              </div>
              <button onClick={() => setShowInvite(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="px-6 py-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Full Name</label>
                <input className={INPUT} placeholder="Jane Smith" required
                  value={invite.name} onChange={e => setInvite(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
                <input type="email" className={INPUT} placeholder="jane@company.com" required
                  value={invite.email} onChange={e => setInvite(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Temporary Password</label>
                <input type="password" className={INPUT} placeholder="Min 6 characters" required
                  value={invite.password} onChange={e => setInvite(p => ({ ...p, password: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Role</label>
                <select className={SELECT} value={invite.role}
                  onChange={e => setInvite(p => ({ ...p, role: e.target.value }))}>
                  {ROLES.map(r => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1.5">
                  {invite.role === 'admin'  && 'Full access — can manage all users and settings.'}
                  {invite.role === 'editor' && 'Can create and edit jobs, candidates and pipeline.'}
                  {invite.role === 'viewer' && 'Read-only — can view all data but cannot make changes.'}
                </p>
              </div>

              {inviteMsg && (
                <div className={`flex items-center gap-2 text-sm ${inviteMsg.ok ? 'text-emerald-600' : 'text-red-500'}`}>
                  {inviteMsg.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {inviteMsg.text}
                </div>
              )}

              <div className="flex items-center gap-3 pt-1">
                <button type="button" onClick={() => setShowInvite(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={inviting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-all shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
                  {inviting ? <><QlogoLoader size={14} /> Inviting…</> : <><UserPlus className="w-4 h-4" /> Send Invite</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
