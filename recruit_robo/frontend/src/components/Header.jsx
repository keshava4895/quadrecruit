import { useState, useRef, useEffect } from 'react'
import { LogOut, ChevronDown, Link2, Link2Off, Settings, Mail, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { linkedinApi, searchApi, authApi } from '../api'

const LI_ICON = (
  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
  </svg>
)

export default function Header() {
  const { user, logout }   = useAuth()
  const navigate            = useNavigate()
  const [open, setOpen]     = useState(false)
  const dropdownRef         = useRef(null)

  // Portal connection states
  const [liAccounts,    setLiAccounts]    = useState([])
  const [liLoading,     setLiLoading]     = useState(false)
  const [naukriSession, setNaukriSession] = useState(null)
  const [naukriCurl,    setNaukriCurl]    = useState('')
  const [naukriSaving,  setNaukriSaving]  = useState(false)
  const [naukriMsg,     setNaukriMsg]     = useState('')
  const [showNaukriInput, setShowNaukriInput] = useState(false)
  const [activeTab,     setActiveTab]     = useState('portals')

  // Email settings state
  const [emailConfigured, setEmailConfigured] = useState(false)
  const [showEmailInput,  setShowEmailInput]  = useState(false)
  const [emailPass,       setEmailPass]       = useState('')
  const [showPass,        setShowPass]        = useState(false)
  const [emailSaving,     setEmailSaving]     = useState(false)
  const [emailMsg,        setEmailMsg]        = useState('')

  const avatar = user?.avatar || user?.name?.charAt(0)?.toUpperCase() || '?'

  // Close on outside click
  useEffect(() => {
    function onOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  // Load portal + email states when dropdown opens
  useEffect(() => {
    if (!open) return
    linkedinApi.accounts().then(r => setLiAccounts(r.data.accounts || [])).catch(() => {})
    searchApi.getNaukriSession().then(r => setNaukriSession(r.data)).catch(() => {})
    authApi.getEmailSettings().then(r => setEmailConfigured(r.data.configured)).catch(() => {})
  }, [open])

  function handleLogout() {
    setOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  async function connectLinkedIn() {
    setLiLoading(true)
    try {
      const r = await linkedinApi.connectUrl(user?.userId || 'user', user?.name || 'Recruiter')
      window.open(r.data.url, '_blank')
      // Poll for new account after user connects
      setTimeout(async () => {
        const r2 = await linkedinApi.accounts()
        setLiAccounts(r2.data.accounts || [])
        setLiLoading(false)
      }, 4000)
    } catch { setLiLoading(false) }
  }

  async function disconnectLinkedIn(id) {
    await linkedinApi.disconnect(id)
    setLiAccounts(prev => prev.filter(a => a.id !== id))
  }

  async function saveNaukri() {
    if (!naukriCurl.trim()) return
    setNaukriSaving(true)
    setNaukriMsg('')
    try {
      await searchApi.saveNaukriSession(naukriCurl.trim())
      setNaukriMsg('Saved!')
      setNaukriCurl('')
      setShowNaukriInput(false)
      const r = await searchApi.getNaukriSession()
      setNaukriSession(r.data)
    } catch { setNaukriMsg('Failed to save.') }
    finally { setNaukriSaving(false) }
  }

  async function clearNaukri() {
    await searchApi.deleteNaukriSession()
    setNaukriSession({ configured: false })
    setNaukriMsg('')
    setShowNaukriInput(false)
  }

  return (
    <header className="h-16 bg-blue-600 flex items-center justify-end px-6 flex-shrink-0 z-50 shadow-sm">

      {/* User avatar with dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 hover:bg-white/10 rounded-lg px-2 py-1.5 transition-colors"
        >
          <div className="w-8 h-8 bg-white/25 rounded-full flex items-center justify-center text-white text-sm font-semibold select-none">
            {avatar}
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-blue-200 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown panel */}
        {open && (
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">

            {/* User info */}
            <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/25 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {avatar}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{user?.name}</p>
                  {user?.email && <p className="text-blue-200 text-xs truncate">{user.email}</p>}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setActiveTab('portals')}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  activeTab === 'portals' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                Connected Portals
              </button>
              <button
                onClick={() => setActiveTab('account')}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  activeTab === 'account' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                Account
              </button>
            </div>

            {/* Portals tab */}
            {activeTab === 'portals' && (
              <div className="p-3 space-y-2 max-h-72 overflow-y-auto">

                {/* LinkedIn */}
                <div className="border border-gray-100 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center text-white flex-shrink-0">
                      {LI_ICON}
                    </div>
                    <span className="text-sm font-medium text-gray-800">LinkedIn</span>
                    {liAccounts.length > 0
                      ? <span className="ml-auto flex items-center gap-1 text-xs text-emerald-600 font-medium"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />Connected</span>
                      : <span className="ml-auto text-xs text-gray-400">Not connected</span>
                    }
                  </div>

                  {liAccounts.length > 0 ? (
                    <div className="space-y-1">
                      {liAccounts.map(acc => (
                        <div key={acc.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-2.5 py-1.5">
                          <span className="text-xs text-gray-700 truncate">{acc.name || acc.id}</span>
                          <button onClick={() => disconnectLinkedIn(acc.id)}
                            className="text-red-400 hover:text-red-600 ml-2 flex-shrink-0" title="Disconnect">
                            <Link2Off className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button onClick={connectLinkedIn} disabled={liLoading}
                        className="w-full mt-1 text-xs text-blue-600 hover:underline disabled:opacity-50">
                        {liLoading ? 'Opening…' : '+ Add another account'}
                      </button>
                    </div>
                  ) : (
                    <button onClick={connectLinkedIn} disabled={liLoading}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors">
                      <Link2 className="w-3 h-3" />
                      {liLoading ? 'Opening…' : 'Connect LinkedIn'}
                    </button>
                  )}
                </div>

                {/* Naukri */}
                <div className="border border-gray-100 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-orange-500 rounded-md flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">N</div>
                    <span className="text-sm font-medium text-gray-800">Naukri Resdex</span>
                    {naukriSession?.configured
                      ? <span className="ml-auto flex items-center gap-1 text-xs text-emerald-600 font-medium"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />Active</span>
                      : <span className="ml-auto text-xs text-gray-400">Not configured</span>
                    }
                  </div>

                  {naukriSession?.configured && !showNaukriInput && (
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-2.5 py-1.5 mb-1.5">
                      <p className="text-xs text-gray-500 truncate">{naukriSession.preview}</p>
                      <button onClick={clearNaukri} className="text-red-400 hover:text-red-600 ml-2 flex-shrink-0" title="Remove">
                        <Link2Off className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {!showNaukriInput ? (
                    <button onClick={() => setShowNaukriInput(true)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded-lg transition-colors">
                      <Settings className="w-3 h-3" />
                      {naukriSession?.configured ? 'Update Session' : 'Setup Session'}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500">
                        Log into <strong>resdex.naukri.com</strong> → search → F12 → Network → copy request as cURL
                      </p>
                      <textarea rows={3}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs font-mono text-gray-800 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-orange-400 resize-none"
                        placeholder="curl 'https://resdex.naukri.com/...' -H 'Cookie: ...'"
                        value={naukriCurl} onChange={e => setNaukriCurl(e.target.value)} />
                      {naukriMsg && <p className={`text-xs ${naukriMsg === 'Saved!' ? 'text-emerald-600' : 'text-red-500'}`}>{naukriMsg}</p>}
                      <div className="flex gap-2">
                        <button onClick={saveNaukri} disabled={naukriSaving || !naukriCurl.trim()}
                          className="flex-1 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-medium rounded-lg">
                          {naukriSaving ? 'Saving…' : 'Save'}
                        </button>
                        <button onClick={() => { setShowNaukriInput(false); setNaukriCurl(''); setNaukriMsg('') }}
                          className="flex-1 py-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-medium rounded-lg">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* More portals placeholder */}
                <div className="border border-dashed border-gray-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400">More portals coming soon</p>
                  <p className="text-[11px] text-gray-300 mt-0.5">Indeed · Monster · Glassdoor</p>
                </div>
              </div>
            )}

            {/* Account tab */}
            {activeTab === 'account' && (
              <div className="p-3 space-y-2">
                {/* User info */}
                <div className="bg-gray-50 rounded-xl px-3 py-2.5 space-y-1.5">
                  <div>
                    <p className="text-xs text-gray-400">Name</p>
                    <p className="text-sm font-medium text-gray-800">{user?.name}</p>
                  </div>
                  {user?.email && (
                    <div>
                      <p className="text-xs text-gray-400">Email</p>
                      <p className="text-sm font-medium text-gray-800">{user.email}</p>
                    </div>
                  )}
                  {user?.role && (
                    <div>
                      <p className="text-xs text-gray-400">Role</p>
                      <p className="text-sm font-medium text-gray-800 capitalize">{user.role}</p>
                    </div>
                  )}
                </div>

                {/* Email password for sending */}
                <div className="border border-gray-100 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-800 flex-1">Outgoing Email</span>
                    {emailConfigured
                      ? <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"/>Configured
                        </span>
                      : <span className="text-xs text-gray-400">Not set</span>
                    }
                  </div>
                  <p className="text-xs text-gray-400 mb-2">
                    Save your Outlook password so emails send from <strong>{user?.email}</strong>
                  </p>

                  {emailConfigured && !showEmailInput && (
                    <div className="flex gap-2 mb-2">
                      <div className="flex-1 bg-gray-50 rounded-lg px-2.5 py-1.5 text-xs text-gray-500">
                        Password saved ••••••••
                      </div>
                      <button onClick={async () => {
                        await authApi.clearEmailSettings()
                        setEmailConfigured(false)
                        setEmailMsg('')
                      }} className="text-red-400 hover:text-red-600 px-1" title="Remove">
                        <Link2Off className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {!showEmailInput ? (
                    <button onClick={() => { setShowEmailInput(true); setEmailMsg('') }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-medium rounded-lg transition-colors">
                      <Settings className="w-3 h-3" />
                      {emailConfigured ? 'Update Password' : 'Set Email Password'}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <input
                          type={showPass ? 'text' : 'password'}
                          placeholder="Your Outlook password"
                          value={emailPass}
                          onChange={e => setEmailPass(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 pr-8 text-xs text-gray-800 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-400"
                        />
                        <button type="button" onClick={() => setShowPass(v => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showPass ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                      {emailMsg && (
                        <p className={`text-xs flex items-center gap-1 ${emailMsg.includes('Saved') ? 'text-emerald-600' : 'text-red-500'}`}>
                          {emailMsg.includes('Saved') && <CheckCircle className="w-3 h-3" />}
                          {emailMsg}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <button
                          disabled={emailSaving || !emailPass.trim()}
                          onClick={async () => {
                            setEmailSaving(true); setEmailMsg('')
                            try {
                              await authApi.saveEmailSettings(emailPass.trim())
                              setEmailConfigured(true)
                              setEmailMsg('Saved! Emails will send from your address.')
                              setEmailPass('')
                              setShowEmailInput(false)
                            } catch { setEmailMsg('Failed to save.') }
                            finally { setEmailSaving(false) }
                          }}
                          className="flex-1 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white text-xs font-medium rounded-lg">
                          {emailSaving ? 'Saving…' : 'Save'}
                        </button>
                        <button onClick={() => { setShowEmailInput(false); setEmailPass(''); setEmailMsg('') }}
                          className="flex-1 py-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-medium rounded-lg">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Logout */}
            <div className="border-t border-gray-100">
              <button onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors">
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
