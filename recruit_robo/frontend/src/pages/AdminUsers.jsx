import { useState, useEffect } from 'react'
import { authApi } from '../api'
import { useAuth } from '../context/AuthContext'
import {
  Users, UserPlus, Trash2, ShieldCheck, Eye, AlertCircle,
  CheckCircle, X, Pencil, ChevronUp,
} from 'lucide-react'
import QlogoLoader from '../components/QlogoLoader'

const ROLES = ['admin', 'editor', 'viewer']

const ROLE_STYLE = {
  admin:     { badge: 'bg-purple-100 text-purple-700', label: 'Admin' },
  editor:    { badge: 'bg-blue-100 text-blue-700',     label: 'Editor' },
  recruiter: { badge: 'bg-blue-100 text-blue-700',     label: 'Editor' },
  viewer:    { badge: 'bg-gray-100 text-gray-600',     label: 'Viewer' },
}

const INPUT  = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition'
const SELECT = INPUT

const ROLE_DESC = {
  admin:  'Full access — can manage all users and settings.',
  editor: 'Can create and edit jobs, candidates and pipeline.',
  viewer: 'Read-only — can view all data but cannot make changes.',
}

function RoleBadge({ role }) {
  const s = ROLE_STYLE[role] || ROLE_STYLE.viewer
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${s.badge}`}>{s.label}</span>
}

function StatusBadge({ active }) {
  return active
    ? <span className="flex items-center gap-1 text-xs font-medium text-emerald-600"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />Active</span>
    : <span className="flex items-center gap-1 text-xs font-medium text-gray-400"><span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />Suspended</span>
}

const EMPTY_ADD  = { name: '', email: '', password: '', role: 'viewer' }
const EMPTY_EDIT = { name: '', email: '', role: 'viewer', is_active: true }

export default function AdminUsers() {
  const { user: me } = useAuth()

  const [users,      setUsers]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [actionMsg,  setActionMsg]  = useState(null)

  const [showAdd,    setShowAdd]    = useState(false)
  const [addForm,    setAddForm]    = useState(EMPTY_ADD)
  const [adding,     setAdding]     = useState(false)
  const [addMsg,     setAddMsg]     = useState(null)

  const [editUser,   setEditUser]   = useState(null)
  const [editForm,   setEditForm]   = useState(EMPTY_EDIT)
  const [saving,     setSaving]     = useState(false)
  const [editMsg,    setEditMsg]    = useState(null)

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

  async function handleAdd(e) {
    e.preventDefault()
    setAdding(true); setAddMsg(null)
    try {
      const r = await authApi.inviteUser(addForm)
      setUsers(prev => [...prev, r.data])
      setAddForm(EMPTY_ADD)
      setAddMsg({ ok: true, text: `${r.data.name} added as ${r.data.role}.` })
      setTimeout(() => { setShowAdd(false); setAddMsg(null) }, 1400)
    } catch (err) {
      setAddMsg({ ok: false, text: err.response?.data?.detail || 'Failed to add member.' })
    } finally { setAdding(false) }
  }

  function openEdit(u) {
    setEditUser(u)
    setEditForm({
      name:      u.name,
      email:     u.email,
      role:      u.role === 'recruiter' ? 'editor' : u.role,
      is_active: u.is_active !== false,
    })
    setEditMsg(null)
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    setSaving(true); setEditMsg(null)
    try {
      const r = await authApi.updateUser(editUser.userId, editForm)
      setUsers(prev => prev.map(u => u.userId === editUser.userId ? r.data : u))
      setActionMsg({ ok: true, text: `${r.data.name} updated.` })
      setEditUser(null)
    } catch (err) {
      setEditMsg({ ok: false, text: err.response?.data?.detail || 'Failed to save changes.' })
    } finally { setSaving(false) }
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

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <ShieldCheck className="w-5 h-5 text-purple-500" />
            <h1 className="text-xl font-semibold text-gray-900">Access Management</h1>
          </div>
          <p className="text-sm text-gray-400">Manage team members and their access roles</p>
        </div>

        {/* Add Member toggle — top right */}
        <button
          onClick={() => { setShowAdd(v => !v); setAddMsg(null) }}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl shadow-sm transition-all ${
            showAdd
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'text-white hover:shadow-md'
          }`}
          style={showAdd ? {} : { background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
          {showAdd ? <ChevronUp className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          {showAdd ? 'Close' : 'Add Member'}
        </button>
      </div>

      {/* ── Action flash ── */}
      {actionMsg && (
        <div className={`flex items-center gap-2 mb-4 px-4 py-2.5 rounded-xl text-sm ${
          actionMsg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
        }`}>
          {actionMsg.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {actionMsg.text}
          <button onClick={() => setActionMsg(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* ── Add Member panel (expandable) ── */}
      {showAdd && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden mb-5">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/40">
            <p className="text-sm font-bold text-gray-800">New Team Member</p>
            <p className="text-xs text-gray-400 mt-0.5">Create an account and assign access</p>
          </div>
          <form onSubmit={handleAdd} className="px-5 py-4">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Full Name</label>
                <input className={INPUT} placeholder="Jane Smith" required
                  value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Email Address</label>
                <input type="email" className={INPUT} placeholder="jane@company.com" required
                  value={addForm.email} onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
                <input type="password" className={INPUT} placeholder="Min 6 characters" required
                  value={addForm.password} onChange={e => setAddForm(p => ({ ...p, password: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Access Role</label>
                <select className={SELECT} value={addForm.role}
                  onChange={e => setAddForm(p => ({ ...p, role: e.target.value }))}>
                  {ROLES.map(r => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
                {addForm.role && <p className="text-xs text-gray-400 mt-1">{ROLE_DESC[addForm.role]}</p>}
              </div>
            </div>

            {addMsg && (
              <div className={`flex items-center gap-2 mb-3 text-sm ${addMsg.ok ? 'text-emerald-600' : 'text-red-500'}`}>
                {addMsg.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {addMsg.text}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { setShowAdd(false); setAddMsg(null) }}
                className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={adding}
                className="flex items-center gap-2 px-5 py-2 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-all shadow-sm hover:shadow-md"
                style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
                {adding ? <><QlogoLoader size={14} /> Adding…</> : <><UserPlus className="w-4 h-4" /> Add Member</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Role guide ── */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { role: 'admin',  icon: ShieldCheck, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100', desc: 'Full access — manage users, jobs, candidates' },
          { role: 'editor', icon: Users,        color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-100',   desc: 'Create and edit jobs, candidates, pipeline' },
          { role: 'viewer', icon: Eye,          color: 'text-gray-500',   bg: 'bg-gray-50 border-gray-100',   desc: 'Read-only — cannot make any changes' },
        ].map(({ role, icon: Icon, color, bg, desc }) => (
          <div key={role} className={`border rounded-xl p-3 ${bg}`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className={`text-xs font-semibold capitalize ${color}`}>{role}</span>
            </div>
            <p className="text-xs text-gray-500">{desc}</p>
          </div>
        ))}
      </div>

      {/* ── Members table ── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/40">
          <p className="text-sm font-bold text-gray-800">
            Team Members <span className="text-gray-400 font-normal">({users.length})</span>
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <QlogoLoader size={48} label="Loading members…" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 px-5 py-8 text-red-500 text-sm">
            <AlertCircle className="w-4 h-4" />{error}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No team members yet</p>
            <button onClick={() => setShowAdd(true)}
              className="mt-3 text-sm text-purple-600 hover:underline">Add the first member →</button>
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
                      <td className="px-4 py-3.5"><RoleBadge role={u.role} /></td>
                      <td className="px-4 py-3.5"><StatusBadge active={u.is_active !== false} /></td>
                      <td className="px-4 py-3.5 text-xs text-gray-400">{joined}</td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => openEdit(u)} title="Edit"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {!isMe && (
                            <>
                              <button
                                onClick={() => handleToggleActive(u.userId, u.is_active !== false)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                                  u.is_active !== false
                                    ? 'border-amber-200 text-amber-600 hover:bg-amber-50'
                                    : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                                }`}>
                                {u.is_active !== false ? 'Suspend' : 'Activate'}
                              </button>
                              <button onClick={() => handleDelete(u.userId, u.name)} title="Delete"
                                className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Edit modal ── */}
      {editUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
                  {editUser.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Edit Member</p>
                  <p className="text-xs text-gray-400">{editUser.email}</p>
                </div>
              </div>
              <button onClick={() => setEditUser(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="px-6 py-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Full Name</label>
                <input className={INPUT} required value={editForm.name}
                  onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Email Address</label>
                <input type="email" className={INPUT} required value={editForm.email}
                  onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Access Role</label>
                <select className={SELECT} value={editForm.role}
                  onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}
                  disabled={editUser.userId === me?.userId}>
                  {ROLES.map(r => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
                {editUser.userId === me?.userId && (
                  <p className="text-xs text-gray-400 mt-1">You cannot change your own role.</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
                <div className="flex gap-2">
                  {[true, false].map(val => (
                    <button key={String(val)} type="button"
                      onClick={() => setEditForm(p => ({ ...p, is_active: val }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                        editForm.is_active === val
                          ? val
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                            : 'bg-amber-50 border-amber-300 text-amber-700'
                          : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                      }`}>
                      {val ? 'Active' : 'Suspended'}
                    </button>
                  ))}
                </div>
              </div>

              {editMsg && (
                <div className={`flex items-center gap-2 text-sm ${editMsg.ok ? 'text-emerald-600' : 'text-red-500'}`}>
                  {editMsg.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {editMsg.text}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditUser(null)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-all shadow-sm hover:shadow-md"
                  style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
                  {saving ? <><QlogoLoader size={14} /> Saving…</> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
