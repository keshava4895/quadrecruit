import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../api'
import {
  UserCircle, Lock, CheckCircle, AlertCircle,
  Eye, EyeOff, Camera, ChevronDown, ChevronUp, Trash2, Upload, X,
} from 'lucide-react'
import QlogoLoader from '../components/QlogoLoader'
import { ScaledAvatar, PRESETS } from '../components/AvatarPreset'

const ROLE_STYLES = {
  admin:     'bg-purple-100 text-purple-700',
  editor:    'bg-blue-100 text-blue-700',
  viewer:    'bg-gray-100 text-gray-600',
  recruiter: 'bg-blue-100 text-blue-700',
}

const INPUT = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition'

function resizeImage(file, maxPx = 200) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = maxPx
        const size = Math.min(img.width, img.height)
        canvas.getContext('2d').drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, maxPx, maxPx)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function parseAvatar(stored) {
  if (!stored) return null
  try {
    const parsed = JSON.parse(stored)
    return parsed
  } catch {
    // Legacy: plain data URL
    return { type: 'photo', data: stored }
  }
}

export default function Profile() {
  const { user, login } = useAuth()
  const fileRef       = useRef(null)
  const dropFileRef   = useRef(null)
  const avatarKey     = `rr_avatar_${user?.userId}`

  const [avatar,      setAvatar]      = useState(() => parseAvatar(localStorage.getItem(avatarKey)))
  const [pickerOpen,  setPickerOpen]  = useState(false)
  const [pickerTab,   setPickerTab]   = useState('preset')  // 'preset' | 'upload'
  const [draftPreset, setDraftPreset] = useState(null)
  const [draftPhoto,  setDraftPhoto]  = useState(null)
  const [uploadErr,   setUploadErr]   = useState('')
  const [dragging,    setDragging]    = useState(false)

  const [name,        setName]        = useState(user?.name || '')
  const [nameLoading, setNameLoading] = useState(false)
  const [nameMsg,     setNameMsg]     = useState(null)

  const [showPwForm, setShowPwForm] = useState(false)
  const [currentPw,  setCurrentPw]  = useState('')
  const [newPw,      setNewPw]      = useState('')
  const [confirmPw,  setConfirmPw]  = useState('')
  const [showCur,    setShowCur]    = useState(false)
  const [showNew,    setShowNew]    = useState(false)
  const [pwLoading,  setPwLoading]  = useState(false)
  const [pwMsg,      setPwMsg]      = useState(null)

  const initials  = user?.name?.charAt(0)?.toUpperCase() || '?'
  const roleStyle = ROLE_STYLES[user?.role] || ROLE_STYLES.viewer
  const joinDate  = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null

  // ── Avatar helpers ────────────────────────────────────────────────────────

  function openPicker() {
    setDraftPreset(avatar?.type === 'preset' ? avatar : null)
    setDraftPhoto(null)
    setUploadErr('')
    setPickerTab('preset')
    setPickerOpen(true)
  }

  async function handleFileChange(e, file) {
    const f = file || e?.target?.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/'))    { setUploadErr('Please select an image file.'); return }
    if (f.size > 5 * 1024 * 1024)       { setUploadErr('Image must be under 5 MB.'); return }
    setUploadErr('')
    try {
      const dataUrl = await resizeImage(f, 300)
      setDraftPhoto({ type: 'photo', data: dataUrl })
    } catch { setUploadErr('Failed to process image.') }
    if (e?.target) e.target.value = ''
  }

  function applyAvatar(cfg) {
    localStorage.setItem(avatarKey, JSON.stringify(cfg))
    setAvatar(cfg)
    setPickerOpen(false)
    setDraftPreset(null)
    setDraftPhoto(null)
  }

  function removeAvatar() {
    localStorage.removeItem(avatarKey)
    setAvatar(null)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFileChange(null, f)
  }

  // ── Name + Password ───────────────────────────────────────────────────────

  async function saveName(e) {
    e.preventDefault()
    if (!name.trim() || name.trim() === user?.name) return
    setNameLoading(true); setNameMsg(null)
    try {
      const r = await authApi.updateMe({ name: name.trim() })
      login({ ...user, name: r.data.name }, localStorage.getItem('rr_token'))
      setNameMsg({ ok: true, text: 'Name updated successfully.' })
    } catch (err) {
      setNameMsg({ ok: false, text: err.response?.data?.detail || 'Failed to update name.' })
    } finally { setNameLoading(false) }
  }

  function togglePwForm() {
    setShowPwForm(v => !v)
    setPwMsg(null)
    setCurrentPw(''); setNewPw(''); setConfirmPw('')
    setShowCur(false); setShowNew(false)
  }

  async function savePassword(e) {
    e.preventDefault()
    if (!currentPw || !newPw || !confirmPw) return
    if (newPw !== confirmPw) { setPwMsg({ ok: false, text: 'Passwords do not match.' }); return }
    if (newPw.length < 6)   { setPwMsg({ ok: false, text: 'Password must be at least 6 characters.' }); return }
    setPwLoading(true); setPwMsg(null)
    try {
      await authApi.updateMe({ current_password: currentPw, new_password: newPw })
      setPwMsg({ ok: true, text: 'Password updated successfully.' })
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
      setTimeout(() => { setShowPwForm(false); setPwMsg(null) }, 1800)
    } catch (err) {
      setPwMsg({ ok: false, text: err.response?.data?.detail || 'Failed to update password.' })
    } finally { setPwLoading(false) }
  }

  // ── Avatar render helper ──────────────────────────────────────────────────
  function AvatarDisplay({ cfg, size = 64, className = '' }) {
    if (cfg?.type === 'preset') {
      return <ScaledAvatar {...cfg} size={size} className={className} />
    }
    if (cfg?.type === 'photo' && cfg.data) {
      return <img src={cfg.data} alt="Profile" className={`object-cover ${className}`} style={{ width: size, height: size }} />
    }
    return (
      <div className={`flex items-center justify-center text-white font-bold bg-white/20 ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.35 }}>
        {initials}
      </div>
    )
  }

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="px-6 py-5 w-full max-w-2xl mx-auto">

      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-0.5">
          <UserCircle className="w-5 h-5 text-purple-500" />
          <h1 className="text-xl font-semibold text-gray-900">My Profile</h1>
        </div>
        <p className="text-sm text-gray-400">Manage your account details and security</p>
      </div>

      {/* ── Identity card ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden mb-5">
        <div className="px-6 py-5 flex items-center gap-5"
          style={{ background: 'linear-gradient(135deg, #49029F 0%, #7c3aed 100%)' }}>

          {/* Clickable avatar */}
          <div className="relative group flex-shrink-0 cursor-pointer" onClick={openPicker} title="Change profile photo"
            style={{ width: 64, height: 64 }}>
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/30 group-hover:border-white/70 transition-all">
              <AvatarDisplay cfg={avatar} size={64} />
            </div>
            {/* Hover overlay */}
            <div className="absolute inset-0 rounded-2xl bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <Camera className="w-4 h-4 text-white" />
              <span className="text-white text-[9px] font-medium mt-0.5">Change</span>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-white text-lg font-semibold leading-tight">{user?.name}</p>
            <p className="text-purple-200 text-sm mt-0.5">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${roleStyle}`}>{user?.role}</span>
              {joinDate && <span className="text-purple-200/70 text-xs">Member since {joinDate}</span>}
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div className="px-6 py-2.5 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between gap-3">
          <p className="text-[11px] text-gray-400">Click the avatar to choose a preset or upload your own photo</p>
          {avatar && (
            <button onClick={removeAvatar}
              className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600 font-medium transition-colors flex-shrink-0">
              <Trash2 className="w-3 h-3" /> Remove
            </button>
          )}
        </div>
      </div>

      {/* ── Display Name ──────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden mb-5">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/40">
          <p className="text-sm font-bold text-gray-800">Display Name</p>
        </div>
        <form onSubmit={saveName} className="px-5 py-4 space-y-3">
          <input className={INPUT} value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
          {nameMsg && (
            <div className={`flex items-center gap-2 text-sm ${nameMsg.ok ? 'text-emerald-600' : 'text-red-500'}`}>
              {nameMsg.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {nameMsg.text}
            </div>
          )}
          <div className="flex justify-end">
            <button type="submit" disabled={nameLoading || !name.trim() || name.trim() === user?.name}
              className="flex items-center gap-2 px-5 py-2 disabled:opacity-40 text-white text-sm font-medium rounded-xl shadow-sm hover:shadow-md transition-all"
              style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
              {nameLoading && <QlogoLoader size={14} />}
              {nameLoading ? 'Saving…' : 'Save Name'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Change Password (collapsible) ─────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <button type="button" onClick={togglePwForm}
          className="w-full flex items-center justify-between px-5 py-3.5 bg-gray-50/40 hover:bg-gray-50 transition-colors group">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors" />
            <p className="text-sm font-bold text-gray-800">Change Password</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400">{showPwForm ? 'Cancel' : 'Click to reset password'}</span>
            {showPwForm ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </button>

        {!showPwForm && (
          <div className="px-5 py-3 border-t border-gray-50">
            <p className="text-[11px] text-gray-400">Use a strong password with at least 6 characters. Click above to update.</p>
          </div>
        )}

        {showPwForm && (
          <form onSubmit={savePassword} className="px-5 py-4 space-y-3 border-t border-gray-100">
            <div className="relative">
              <input type={showCur ? 'text' : 'password'} className={INPUT + ' pr-10'} placeholder="Current password"
                value={currentPw} onChange={e => setCurrentPw(e.target.value)} autoComplete="current-password" />
              <button type="button" onClick={() => setShowCur(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showCur ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="relative">
              <input type={showNew ? 'text' : 'password'} className={INPUT + ' pr-10'} placeholder="New password (min 6 characters)"
                value={newPw} onChange={e => setNewPw(e.target.value)} autoComplete="new-password" />
              <button type="button" onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <input type="password" className={INPUT} placeholder="Confirm new password"
              value={confirmPw} onChange={e => setConfirmPw(e.target.value)} autoComplete="new-password" />
            {pwMsg && (
              <div className={`flex items-center gap-2 text-sm ${pwMsg.ok ? 'text-emerald-600' : 'text-red-500'}`}>
                {pwMsg.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {pwMsg.text}
              </div>
            )}
            <div className="flex justify-end">
              <button type="submit" disabled={pwLoading || !currentPw || !newPw || !confirmPw}
                className="flex items-center gap-2 px-5 py-2 disabled:opacity-40 text-white text-sm font-medium rounded-xl shadow-sm hover:shadow-md transition-all"
                style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
                {pwLoading && <QlogoLoader size={14} />}
                {pwLoading ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          Avatar Picker Modal
      ══════════════════════════════════════════════════════════════════════ */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setPickerOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-purple-600" />
                <h2 className="text-sm font-semibold text-gray-800">Choose Profile Photo</h2>
              </div>
              <button onClick={() => setPickerOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-5">
              {[
                { key: 'preset', label: 'Choose Avatar' },
                { key: 'upload', label: 'Upload Photo' },
              ].map(t => (
                <button key={t.key} onClick={() => setPickerTab(t.key)}
                  className={`px-1 py-3 text-xs font-medium mr-5 border-b-2 transition-colors ${
                    pickerTab === t.key
                      ? 'border-purple-600 text-purple-700'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── Preset tab ─────────────────────────────────────────────── */}
            {pickerTab === 'preset' && (
              <div className="p-5">
                <p className="text-[11px] text-gray-400 mb-3">
                  Pick an avatar that represents you — choose skin tone, hair style and gender.
                </p>
                <div className="grid grid-cols-4 gap-3">
                  {PRESETS.map(p => {
                    const selected = draftPreset?.id === p.id
                    return (
                      <button key={p.id} type="button" onClick={() => setDraftPreset(p)}
                        className={`rounded-xl overflow-hidden border-2 transition-all focus:outline-none ${
                          selected
                            ? 'border-purple-500 shadow-md shadow-purple-100'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                        title={p.label}>
                        <ScaledAvatar tone={p.tone} hair={p.hair} gender={p.gender} hairColor={p.hairColor} size={100} />
                        <div className={`py-1 text-center text-[10px] font-medium transition-colors ${
                          selected ? 'bg-purple-50 text-purple-700' : 'bg-gray-50 text-gray-500'
                        }`}>
                          {p.label}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Upload tab ─────────────────────────────────────────────── */}
            {pickerTab === 'upload' && (
              <div className="p-5">
                <input ref={dropFileRef} type="file" accept="image/*" className="hidden"
                  onChange={handleFileChange} />

                {draftPhoto ? (
                  <div className="flex flex-col items-center gap-3">
                    <img src={draftPhoto.data} alt="Preview"
                      className="w-32 h-32 rounded-2xl object-cover border-2 border-purple-200 shadow-sm" />
                    <p className="text-xs text-gray-500">Looking good! Click <strong>Use this Photo</strong> below to confirm.</p>
                    <button type="button" onClick={() => { setDraftPhoto(null); setUploadErr('') }}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors">
                      Choose a different photo
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={e => { e.preventDefault(); setDragging(true) }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => dropFileRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
                      dragging ? 'border-purple-400 bg-purple-50' : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50/50'
                    }`}>
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <Upload className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700">Click to upload or drag & drop</p>
                      <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, WEBP · max 5 MB</p>
                    </div>
                  </div>
                )}

                {uploadErr && (
                  <p className="mt-2 text-xs text-red-500 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />{uploadErr}
                  </p>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/40">
              <button type="button" onClick={() => setPickerOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              {pickerTab === 'preset' && (
                <button type="button"
                  disabled={!draftPreset}
                  onClick={() => applyAvatar({ type: 'preset', ...draftPreset })}
                  className="px-5 py-2 text-sm font-semibold text-white rounded-xl disabled:opacity-40 transition-opacity hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
                  Use this Avatar
                </button>
              )}
              {pickerTab === 'upload' && (
                <button type="button"
                  disabled={!draftPhoto}
                  onClick={() => applyAvatar(draftPhoto)}
                  className="px-5 py-2 text-sm font-semibold text-white rounded-xl disabled:opacity-40 transition-opacity hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
                  Use this Photo
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
