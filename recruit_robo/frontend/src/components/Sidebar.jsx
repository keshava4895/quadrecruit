import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Briefcase, Users, Cpu, UserCheck,
  ChevronLeft, ChevronRight, LogOut,
  Link2, Link2Off, Settings, Mail, Eye, EyeOff, CheckCircle, ChevronUp,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { linkedinApi, searchApi, authApi, msGraphApi } from '../api'
import QlogoAnimated from './QlogoAnimated'

const NAV = [
  { to: '/dashboard',  label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/jobs',       label: 'Jobs',          icon: Briefcase },
  { to: '/candidates', label: 'Candidates',    icon: Users },
  {
    to: '/upload', label: 'Resume Scorer', icon: Cpu,
    children: [
      { to: '/interviewers', label: 'Interviewers', icon: UserCheck },
    ],
  },
]

const LI_ICON = (
  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
  </svg>
)

export default function Sidebar() {
  const { pathname }              = useLocation()
  const navigate                  = useNavigate()
  const { user, logout }          = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('portals')
  const panelRef                  = useRef(null)

  const avatar = user?.name?.charAt(0)?.toUpperCase() || '?'

  // Portal states
  const [liAccounts,     setLiAccounts]     = useState([])
  const [liLoading,      setLiLoading]      = useState(false)
  const [naukriSession,  setNaukriSession]  = useState(null)
  const [naukriCurl,     setNaukriCurl]     = useState('')
  const [naukriSaving,   setNaukriSaving]   = useState(false)
  const [naukriMsg,      setNaukriMsg]      = useState('')
  const [showNaukriInput,setShowNaukriInput]= useState(false)

  // Microsoft Outlook OAuth state
  const [msConnected,  setMsConnected]  = useState(false)
  const [msConfigured, setMsConfigured] = useState(true)
  const [msConnecting, setMsConnecting] = useState(false)

  // Close panel on outside click
  useEffect(() => {
    function onOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setPanelOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  // Load data when panel opens
  useEffect(() => {
    if (!panelOpen) return
    linkedinApi.accounts().then(r => setLiAccounts(r.data.accounts || [])).catch(() => {})
    searchApi.getNaukriSession().then(r => setNaukriSession(r.data)).catch(() => {})
    msGraphApi.status().then(r => {
      setMsConnected(r.data.connected)
      setMsConfigured(r.data.configured)
    }).catch(() => {})
  }, [panelOpen])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  async function connectLinkedIn() {
    setLiLoading(true)
    try {
      const r = await linkedinApi.connectUrl(user?.userId || 'user', user?.name || 'Recruiter')
      window.open(r.data.url, '_blank')
      setTimeout(async () => {
        const r2 = await linkedinApi.accounts()
        setLiAccounts(r2.data.accounts || [])
        setLiLoading(false)
      }, 4000)
    } catch { setLiLoading(false) }
  }

  async function saveNaukri() {
    if (!naukriCurl.trim()) return
    setNaukriSaving(true); setNaukriMsg('')
    try {
      await searchApi.saveNaukriSession(naukriCurl.trim())
      setNaukriMsg('Saved!')
      setNaukriCurl(''); setShowNaukriInput(false)
      const r = await searchApi.getNaukriSession()
      setNaukriSession(r.data)
    } catch { setNaukriMsg('Failed to save.') }
    finally { setNaukriSaving(false) }
  }

  return (
    <aside
      className={`relative flex flex-col flex-shrink-0 bg-zinc-900 transition-all duration-300 ease-in-out ${
        collapsed ? 'w-[60px]' : 'w-[240px]'
      }`}
    >
      {/* Logo row */}
      <div className="flex items-center h-16 px-4 border-b border-white/5 flex-shrink-0 gap-3">
        <Link to="/dashboard" className="flex items-center gap-3 flex-1 min-w-0">
          <QlogoAnimated className="w-12 h-12 flex-shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold leading-tight">Quad Recruit</p>
              <p className="text-zinc-500 text-xs leading-tight truncate">AI Recruitment</p>
            </div>
          )}
        </Link>
        <button onClick={() => setCollapsed(v => !v)}
          title={collapsed ? 'Expand' : 'Collapse'}
          className="flex-shrink-0 text-zinc-600 hover:text-zinc-300 transition-colors">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon, children }) => {
          const active = to === '/dashboard'
            ? pathname === '/dashboard' || pathname === '/'
            : pathname === to
          return (
            <div key={to}>
              <Link to={to} title={collapsed ? label : undefined}
                className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-all select-none
                  ${collapsed ? 'justify-center px-0 py-2.5 mx-1' : 'px-3 py-2.5'}
                  ${active ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'}`}>
                <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>

              {/* Sub-items — same size as parent, indented by 12px */}
              {!collapsed && children?.map(({ to: childTo, label: childLabel, icon: ChildIcon }) => {
                const childActive = pathname === childTo
                return (
                  <Link key={childTo} to={childTo}
                    className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-all select-none px-3 py-2.5
                      ${childActive ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'}`}>
                    <ChildIcon className="w-[18px] h-[18px] flex-shrink-0" />
                    <span className="truncate">{childLabel}</span>
                  </Link>
                )
              })}

              {/* Collapsed sub-items */}
              {collapsed && children?.map(({ to: childTo, label: childLabel, icon: ChildIcon }) => {
                const childActive = pathname === childTo
                return (
                  <Link key={childTo} to={childTo} title={childLabel}
                    className={`flex justify-center px-0 py-2.5 mx-1 rounded-lg transition-all
                      ${childActive ? 'text-white bg-white/10' : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'}`}>
                    <ChildIcon className="w-[18px] h-[18px]" />
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* User section + panel */}
      <div className="flex-shrink-0 border-t border-white/5" ref={panelRef}>

        {/* Settings panel — pops up above the user row */}
        {panelOpen && !collapsed && (
          <div className="absolute bottom-[60px] left-0 w-[240px] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden mx-0">

            {/* User info header */}
            <div className="px-4 py-3 bg-gradient-to-r from-zinc-800 to-zinc-900">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {avatar}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{user?.name}</p>
                  {user?.email && <p className="text-zinc-400 text-xs truncate">{user.email}</p>}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100">
              {['portals', 'account'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
                    activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'
                  }`}>
                  {tab === 'portals' ? 'Portals' : 'Account'}
                </button>
              ))}
            </div>

            {/* Portals tab */}
            {activeTab === 'portals' && (
              <div className="p-3 space-y-2 max-h-80 overflow-y-auto">

                {/* LinkedIn */}
                <div className="border border-gray-100 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center text-white flex-shrink-0">{LI_ICON}</div>
                    <span className="text-xs font-medium text-gray-800 flex-1">LinkedIn</span>
                    {liAccounts.length > 0
                      ? <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"/>Connected</span>
                      : <span className="text-[10px] text-gray-400">Not connected</span>}
                  </div>
                  {liAccounts.length > 0 ? (
                    <div className="space-y-1">
                      {liAccounts.map(acc => (
                        <div key={acc.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-2 py-1">
                          <span className="text-[11px] text-gray-700 truncate">{acc.name || acc.id}</span>
                          <button onClick={async () => { await linkedinApi.disconnect(acc.id); setLiAccounts(prev => prev.filter(a => a.id !== acc.id)) }}
                            className="text-red-400 hover:text-red-600 ml-1 flex-shrink-0"><Link2Off className="w-3 h-3" /></button>
                        </div>
                      ))}
                      <button onClick={connectLinkedIn} disabled={liLoading}
                        className="w-full mt-1 text-[11px] text-blue-600 hover:underline disabled:opacity-50">
                        {liLoading ? 'Opening…' : '+ Add account'}
                      </button>
                    </div>
                  ) : (
                    <button onClick={connectLinkedIn} disabled={liLoading}
                      className="w-full flex items-center justify-center gap-1 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[11px] font-medium rounded-lg transition-colors">
                      <Link2 className="w-3 h-3" />{liLoading ? 'Opening…' : 'Connect LinkedIn'}
                    </button>
                  )}
                </div>

                {/* Naukri */}
                <div className="border border-gray-100 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 bg-orange-500 rounded flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">N</div>
                    <span className="text-xs font-medium text-gray-800 flex-1">Naukri Resdex</span>
                    {naukriSession?.configured
                      ? <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"/>Active</span>
                      : <span className="text-[10px] text-gray-400">Not set</span>}
                  </div>
                  {naukriSession?.configured && !showNaukriInput && (
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-2 py-1 mb-1.5">
                      <p className="text-[10px] text-gray-500 truncate">{naukriSession.preview}</p>
                      <button onClick={async () => { await searchApi.deleteNaukriSession(); setNaukriSession({ configured: false }) }}
                        className="text-red-400 hover:text-red-600 ml-1"><Link2Off className="w-3 h-3" /></button>
                    </div>
                  )}
                  {!showNaukriInput ? (
                    <button onClick={() => setShowNaukriInput(true)}
                      className="w-full flex items-center justify-center gap-1 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-medium rounded-lg transition-colors">
                      <Settings className="w-3 h-3" />{naukriSession?.configured ? 'Update' : 'Setup Session'}
                    </button>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-gray-500">Log into resdex.naukri.com → search → F12 → copy as cURL</p>
                      <textarea rows={2} className="w-full border border-gray-200 rounded px-2 py-1 text-[10px] font-mono bg-gray-50 focus:outline-none resize-none"
                        placeholder="curl 'https://resdex.naukri.com/...'" value={naukriCurl} onChange={e => setNaukriCurl(e.target.value)} />
                      {naukriMsg && <p className={`text-[10px] ${naukriMsg === 'Saved!' ? 'text-emerald-600' : 'text-red-500'}`}>{naukriMsg}</p>}
                      <div className="flex gap-1.5">
                        <button onClick={saveNaukri} disabled={naukriSaving || !naukriCurl.trim()}
                          className="flex-1 py-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-[11px] font-medium rounded">
                          {naukriSaving ? 'Saving…' : 'Save'}
                        </button>
                        <button onClick={() => { setShowNaukriInput(false); setNaukriCurl(''); setNaukriMsg('') }}
                          className="flex-1 py-1 border border-gray-200 text-gray-600 text-[11px] font-medium rounded">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border border-dashed border-gray-200 rounded-xl p-2 text-center">
                  <p className="text-[10px] text-gray-400">More portals coming soon</p>
                </div>
              </div>
            )}

            {/* Account tab */}
            {activeTab === 'account' && (
              <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
                <div className="bg-gray-50 rounded-xl px-3 py-2 space-y-1.5">
                  <div><p className="text-[10px] text-gray-400">Name</p><p className="text-xs font-medium text-gray-800">{user?.name}</p></div>
                  {user?.email && <div><p className="text-[10px] text-gray-400">Email</p><p className="text-xs font-medium text-gray-800">{user.email}</p></div>}
                  {user?.role && <div><p className="text-[10px] text-gray-400">Role</p><p className="text-xs font-medium text-gray-800 capitalize">{user.role}</p></div>}
                </div>

                {/* Outlook / Microsoft Graph */}
                <div className="border border-gray-100 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Mail className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                    <span className="text-xs font-medium text-gray-800 flex-1">Outgoing Email</span>
                    {msConnected
                      ? <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"/>Connected</span>
                      : <span className="text-[10px] text-gray-400">Not connected</span>}
                  </div>

                  {msConnected ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between bg-emerald-50 rounded-lg px-2.5 py-1.5">
                        <span className="text-[10px] text-emerald-700 font-medium">Outlook connected — emails send via Microsoft</span>
                        <button onClick={async () => { await msGraphApi.disconnect(); setMsConnected(false) }}
                          className="text-red-400 hover:text-red-600 ml-1" title="Disconnect">
                          <Link2Off className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : !msConfigured ? (
                    <p className="text-[10px] text-amber-600 bg-amber-50 rounded-lg px-2.5 py-1.5">
                      Microsoft OAuth not configured. Add MS_CLIENT_ID to backend env vars.
                    </p>
                  ) : (
                    <button
                      disabled={msConnecting}
                      onClick={async () => {
                        setMsConnecting(true)
                        try {
                          const r = await msGraphApi.authorizeUrl()
                          window.location.href = r.data.url
                        } catch { setMsConnecting(false) }
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-[#0078d4] hover:bg-[#106ebe] disabled:opacity-50 text-white text-[11px] font-medium rounded-lg transition-colors">
                      <Mail className="w-3 h-3" />
                      {msConnecting ? 'Redirecting…' : 'Connect Outlook'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Logout */}
            <div className="border-t border-gray-100">
              <button onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                <LogOut className="w-4 h-4" />Sign out
              </button>
            </div>
          </div>
        )}

        {/* User row — clickable to open panel */}
        {!collapsed ? (
          <button onClick={() => setPanelOpen(v => !v)}
            className="w-full flex items-center gap-2.5 px-3 py-3 hover:bg-white/5 transition-colors group">
            <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {avatar}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-zinc-200 text-xs font-medium truncate">{user?.name}</p>
              {user?.email && <p className="text-zinc-500 text-[11px] truncate">{user.email}</p>}
            </div>
            <ChevronUp className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${panelOpen ? '' : 'rotate-180'}`} />
          </button>
        ) : (
          <button onClick={() => setPanelOpen(v => !v)}
            title="Account settings"
            className="w-full flex justify-center py-3 text-zinc-500 hover:text-zinc-200 transition-colors">
            <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-white text-xs font-bold">
              {avatar}
            </div>
          </button>
        )}
      </div>
    </aside>
  )
}
