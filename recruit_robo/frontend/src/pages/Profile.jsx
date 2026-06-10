import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../api'
import { UserCircle, Lock, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'
import QlogoLoader from '../components/QlogoLoader'

const ROLE_STYLES = {
  admin:     'bg-purple-100 text-purple-700',
  editor:    'bg-blue-100 text-blue-700',
  viewer:    'bg-gray-100 text-gray-600',
  recruiter: 'bg-blue-100 text-blue-700',
}

const INPUT = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition'

export default function Profile() {
  const { user, login } = useAuth()

  const [name,        setName]        = useState(user?.name || '')
  const [nameLoading, setNameLoading] = useState(false)
  const [nameMsg,     setNameMsg]     = useState(null)

  const [currentPw,  setCurrentPw]  = useState('')
  const [newPw,      setNewPw]      = useState('')
  const [confirmPw,  setConfirmPw]  = useState('')
  const [showCur,    setShowCur]    = useState(false)
  const [showNew,    setShowNew]    = useState(false)
  const [pwLoading,  setPwLoading]  = useState(false)
  const [pwMsg,      setPwMsg]      = useState(null)

  const avatar    = user?.name?.charAt(0)?.toUpperCase() || '?'
  const roleStyle = ROLE_STYLES[user?.role] || ROLE_STYLES.viewer
  const joinDate  = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null

  async function saveName(e) {
    e.preventDefault()
    if (!name.trim() || name.trim() === user?.name) return
    setNameLoading(true); setNameMsg(null)
    try {
      const r = await authApi.updateMe({ name: name.trim() })
      const updated = r.data
      login({ ...user, name: updated.name }, localStorage.getItem('rr_token'))
      setNameMsg({ ok: true, text: 'Name updated.' })
    } catch (err) {
      setNameMsg({ ok: false, text: err.response?.data?.detail || 'Failed to update name.' })
    } finally { setNameLoading(false) }
  }

  async function savePassword(e) {
    e.preventDefault()
    if (!currentPw || !newPw || !confirmPw) return
    if (newPw !== confirmPw) { setPwMsg({ ok: false, text: 'Passwords do not match.' }); return }
    if (newPw.length < 6)    { setPwMsg({ ok: false, text: 'Password must be at least 6 characters.' }); return }
    setPwLoading(true); setPwMsg(null)
    try {
      await authApi.updateMe({ current_password: currentPw, new_password: newPw })
      setPwMsg({ ok: true, text: 'Password updated.' })
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    } catch (err) {
      setPwMsg({ ok: false, text: err.response?.data?.detail || 'Failed to update password.' })
    } finally { setPwLoading(false) }
  }

  return (
    <div className="px-6 py-5 w-full max-w-2xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-0.5">
          <UserCircle className="w-5 h-5 text-purple-500" />
          <h1 className="text-xl font-semibold text-gray-900">My Profile</h1>
        </div>
        <p className="text-sm text-gray-400">Manage your account details and password</p>
      </div>

      {/* Identity card */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden mb-5">
        <div className="px-6 py-5 flex items-center gap-5"
          style={{ background: 'linear-gradient(135deg, #49029F 0%, #7c3aed 100%)' }}>
          <div className="w-16 h-16 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {avatar}
          </div>
          <div>
            <p className="text-white text-lg font-semibold leading-tight">{user?.name}</p>
            <p className="text-purple-200 text-sm mt-0.5">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${roleStyle}`}>
                {user?.role}
              </span>
              {joinDate && (
                <span className="text-purple-200/70 text-xs">Member since {joinDate}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit name */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden mb-5">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/40">
          <p className="text-sm font-bold text-gray-800">Display Name</p>
        </div>
        <form onSubmit={saveName} className="px-5 py-4 space-y-3">
          <input
            className={INPUT}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
          />
          {nameMsg && (
            <div className={`flex items-center gap-2 text-sm ${nameMsg.ok ? 'text-emerald-600' : 'text-red-500'}`}>
              {nameMsg.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {nameMsg.text}
            </div>
          )}
          <div className="flex justify-end">
            <button type="submit" disabled={nameLoading || !name.trim() || name.trim() === user?.name}
              className="flex items-center gap-2 px-5 py-2 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-all shadow-sm hover:shadow-md"
              style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
              {nameLoading ? <QlogoLoader size={14} /> : null}
              {nameLoading ? 'Saving…' : 'Save Name'}
            </button>
          </div>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/40 flex items-center gap-2">
          <Lock className="w-4 h-4 text-gray-400" />
          <p className="text-sm font-bold text-gray-800">Change Password</p>
        </div>
        <form onSubmit={savePassword} className="px-5 py-4 space-y-3">

          {/* Current password */}
          <div className="relative">
            <input
              type={showCur ? 'text' : 'password'}
              className={INPUT + ' pr-10'}
              placeholder="Current password"
              value={currentPw}
              onChange={e => setCurrentPw(e.target.value)}
            />
            <button type="button" onClick={() => setShowCur(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showCur ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* New password */}
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              className={INPUT + ' pr-10'}
              placeholder="New password (min 6 characters)"
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
            />
            <button type="button" onClick={() => setShowNew(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Confirm password */}
          <input
            type="password"
            className={INPUT}
            placeholder="Confirm new password"
            value={confirmPw}
            onChange={e => setConfirmPw(e.target.value)}
          />

          {pwMsg && (
            <div className={`flex items-center gap-2 text-sm ${pwMsg.ok ? 'text-emerald-600' : 'text-red-500'}`}>
              {pwMsg.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {pwMsg.text}
            </div>
          )}

          <div className="flex justify-end">
            <button type="submit"
              disabled={pwLoading || !currentPw || !newPw || !confirmPw}
              className="flex items-center gap-2 px-5 py-2 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-all shadow-sm hover:shadow-md"
              style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
              {pwLoading ? <QlogoLoader size={14} /> : null}
              {pwLoading ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

    </div>
  )
}
