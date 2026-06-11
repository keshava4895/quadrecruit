import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import QlogoLoader from '../components/QlogoLoader'
import {
  Search, Briefcase, X, ArrowRight,
  Settings, Moon, Sun, Type, UserCircle, Users, Bell,
  Calendar, FileText, CheckCircle, XCircle, Activity, RefreshCw,
  LogOut, Link2, Link2Off, Mail, ChevronDown,
} from 'lucide-react'
import { candidatesApi, jobsApi, linkedinApi, searchApi, msGraphApi } from '../api'
import { useSettings } from '../context/SettingsContext'
import { useAuth } from '../context/AuthContext'
import { useNotifications, timeAgo } from '../context/NotificationsContext'
import { ScaledAvatar } from './AvatarPreset'

const LI_ICON = (
  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
  </svg>
)

const PAGE_LABELS = {
  '/dashboard':          'Dashboard',
  '/jobs':               'Jobs',
  '/candidates':         'Talent Search',
  '/pipeline':           'Pipeline',
  '/analytics':          'Analytics',
  '/candidate-database': 'Talent Pool',
  '/upload':             'Resume Scorer',
  '/interviewers':       'Interviewers',
  '/offers':             'Offers',
  '/interviews':         'Interviews',
  '/profile':            'My Profile',
  '/admin/users':        'Access Management',
}

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function TopBar() {
  const navigate           = useNavigate()
  const { pathname }       = useLocation()
  const inputRef           = useRef(null)
  const wrapRef            = useRef(null)
  const settingsRef        = useRef(null)

  const { fontSize, setFontSize, darkMode, setDarkMode } = useSettings()
  const { user, logout } = useAuth()
  const { notifications, loading: nLoading, unreadCount, markAllRead, markRead, refresh: refreshNotifs } = useNotifications()

  // Load avatar from localStorage (same format as Profile.jsx)
  const avatarData = (() => {
    const stored = user ? localStorage.getItem(`rr_avatar_${user.userId}`) : null
    if (!stored) return null
    try { return JSON.parse(stored) } catch { return { type: 'photo', data: stored } }
  })()


  const [query,        setQuery]        = useState('')
  const [focused,      setFocused]      = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [results,      setResults]      = useState({ jobs: [], candidates: [] })
  const [settingsOpen, setSettingsOpen]     = useState(false)
  const [notifOpen,    setNotifOpen]        = useState(false)
  const [userOpen,     setUserOpen]         = useState(false)
  const [sliderVal,    setSliderVal]        = useState(() => (typeof fontSize === 'number' ? fontSize : 100))

  // User panel state (portals + account)
  const userRef                          = useRef(null)
  const [userTab,          setUserTab]         = useState('account')
  const [liAccounts,       setLiAccounts]      = useState([])
  const [liLoading,        setLiLoading]       = useState(false)
  const [naukriSession,    setNaukriSession]    = useState(null)
  const [naukriCurl,       setNaukriCurl]       = useState('')
  const [naukriSaving,     setNaukriSaving]     = useState(false)
  const [naukriMsg,        setNaukriMsg]        = useState('')
  const [showNaukriInput,  setShowNaukriInput]  = useState(false)
  const [msConnected,      setMsConnected]      = useState(false)
  const [msConfigured,     setMsConfigured]     = useState(true)
  const [msConnecting,     setMsConnecting]     = useState(false)

  const notifRef = useRef(null)

  const debounced = useDebounce(query.trim(), 280)

  const pageLabel = (() => {
    if (pathname.startsWith('/jobs/')) return 'Job Detail'
    if (pathname.startsWith('/candidates/')) return 'Candidate Profile'
    return PAGE_LABELS[pathname] || ''
  })()

  // Search on debounced input
  useEffect(() => {
    if (!debounced) { setResults({ jobs: [], candidates: [] }); return }
    let cancelled = false
    setLoading(true)
    const q = debounced.toLowerCase()
    Promise.all([
      jobsApi.list().catch(() => ({ data: [] })),
      candidatesApi.listAll({ limit: 100 }).catch(() => ({ data: { candidates: [] } })),
    ]).then(([jobsRes, candRes]) => {
      if (cancelled) return
      const jobs = (jobsRes.data || [])
        .filter(j => j.title?.toLowerCase().includes(q) || j.jobId?.toLowerCase().includes(q))
        .slice(0, 4)
      const candidates = (candRes.data?.candidates || [])
        .filter(c => c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q))
        .slice(0, 4)
      setResults({ jobs, candidates })
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [debounced])

  // Close search on outside click
  useEffect(() => {
    function onOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setFocused(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  // Close settings on outside click
  useEffect(() => {
    function onOutside(e) {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setSettingsOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  // Close notifications on outside click
  useEffect(() => {
    function onOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  // Close user panel on outside click
  useEffect(() => {
    function onOutside(e) {
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  // Load portal data when user panel opens
  useEffect(() => {
    if (!userOpen) return
    linkedinApi.accounts().then(r => setLiAccounts(r.data.accounts || [])).catch(() => {})
    searchApi.getNaukriSession().then(r => setNaukriSession(r.data)).catch(() => {})
    msGraphApi.status().then(r => {
      setMsConnected(r.data.connected)
      setMsConfigured(r.data.configured)
    }).catch(() => {})
  }, [userOpen])

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

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setFocused(true)
      }
      if (e.key === 'Escape') {
        setFocused(false)
        setQuery('')
        setSettingsOpen(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function go(path) {
    setQuery('')
    setFocused(false)
    navigate(path)
  }

  const hasResults   = results.jobs.length > 0 || results.candidates.length > 0
  const showDropdown = focused && debounced.length > 0

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center px-6 gap-4 flex-shrink-0 z-30">

      {/* Page label */}
      <span className="text-sm font-semibold text-gray-700 whitespace-nowrap min-w-[80px]">
        {pageLabel}
      </span>

      {/* Search — centered */}
      <div className="flex-1 flex justify-center">
        <div className="relative w-full max-w-md" ref={wrapRef}>

          <div className={`flex items-center gap-2.5 bg-gray-50 border rounded-xl px-3.5 py-2 transition-all duration-150 ${
            focused ? 'border-purple-300 bg-white shadow-sm ring-2 ring-purple-100' : 'border-gray-200 hover:border-gray-300'
          }`}>
            <Search className={`w-4 h-4 flex-shrink-0 transition-colors ${focused ? 'text-purple-500' : 'text-gray-400'}`} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              placeholder="Search candidates, jobs…"
              className="flex-1 text-sm bg-transparent text-gray-800 placeholder:text-gray-400 focus:outline-none min-w-0"
            />
            {query ? (
              <button onClick={() => { setQuery(''); inputRef.current?.focus() }}
                className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] text-gray-300 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 font-mono flex-shrink-0">
                ⌘K
              </kbd>
            )}
          </div>

          {/* Search dropdown */}
          {showDropdown && (
            <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden">

              {loading && (
                <div className="px-4 py-4 flex items-center justify-center">
                  <QlogoLoader size={32} label="Searching…" />
                </div>
              )}

              {!loading && !hasResults && (
                <div className="px-4 py-4 text-center">
                  <p className="text-sm text-gray-400">No results for <span className="font-medium text-gray-600">"{debounced}"</span></p>
                </div>
              )}

              {!loading && results.jobs.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Jobs</p>
                  {results.jobs.map(j => (
                    <button key={j.jobId}
                      onClick={() => go(`/jobs/${j.jobId}`)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-purple-50 transition-colors group text-left">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #49029F22, #7c3aed22)' }}>
                        <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{j.title}</p>
                        <p className="text-xs text-gray-400 truncate">{j.jobId}{j.location ? ` · ${j.location}` : ''}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-purple-400 transition-colors flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {!loading && results.candidates.length > 0 && (
                <div className={results.jobs.length > 0 ? 'border-t border-gray-50' : ''}>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Candidates</p>
                  {results.candidates.map(c => (
                    <button key={c.candidateId}
                      onClick={() => go(`/candidates/${c.candidateId}`)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-purple-50 transition-colors group text-left">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
                        {c.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                        <p className="text-xs text-gray-400 truncate">{c.email || c.candidateId}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-purple-400 transition-colors flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              <div className="border-t border-gray-50 px-4 py-2 flex items-center justify-between">
                <p className="text-[10px] text-gray-300">Press <kbd className="font-mono bg-gray-100 px-1 rounded">↵</kbd> to select</p>
                <p className="text-[10px] text-gray-300"><kbd className="font-mono bg-gray-100 px-1 rounded">Esc</kbd> to close</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right side — notification + gear icons */}
      <div className="min-w-[80px] flex items-center justify-end gap-1">

        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setNotifOpen(v => !v); setSettingsOpen(false) }}
            title="Notifications"
            className={`relative w-8 h-8 flex items-center justify-center rounded-xl transition-colors ${
              notifOpen
                ? 'bg-purple-100 text-purple-700'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            }`}>
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification panel */}
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-84 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden"
              style={{ width: 340 }}>

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5 text-purple-600" />
                  <span className="text-sm font-semibold text-gray-800">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button onClick={markAllRead}
                      className="text-[10px] text-purple-600 hover:text-purple-700 font-medium px-2 py-1 rounded-lg hover:bg-purple-50 transition-colors">
                      Mark all read
                    </button>
                  )}
                  <button onClick={() => refreshNotifs()}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                    <RefreshCw className={`w-3 h-3 ${nLoading ? 'animate-spin' : ''}`} />
                  </button>
                  <button onClick={() => setNotifOpen(false)}
                    className="p-0.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                {nLoading && notifications.length === 0 ? (
                  <div className="flex items-center justify-center py-10">
                    <QlogoLoader size={28} label="Loading…" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                      <Bell className="w-5 h-5 text-gray-300" />
                    </div>
                    <p className="text-sm font-medium text-gray-500">No notifications</p>
                    <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
                  </div>
                ) : notifications.map(n => {
                  const IconComp = n.type === 'interview'      ? Calendar
                                 : n.type === 'offer_accepted' ? CheckCircle
                                 : n.type === 'offer_declined' ? XCircle
                                 : n.type === 'offer_pending'  ? FileText
                                 : Activity
                  return (
                    <button key={n.id}
                      onClick={() => { markRead(n.id); navigate(n.link); setNotifOpen(false) }}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                        !n.read ? 'bg-purple-50/30' : ''
                      }`}>
                      {/* Color dot + icon */}
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: `${n.color}20` }}>
                        <IconComp className="w-3.5 h-3.5" style={{ color: n.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs leading-snug ${!n.read ? 'font-semibold text-gray-800' : 'font-medium text-gray-600'}`}>
                          {n.title}
                        </p>
                        {n.subtitle && (
                          <p className="text-[10px] text-gray-400 mt-0.5 truncate">{n.subtitle}</p>
                        )}
                        {n.time && (
                          <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(n.time)}</p>
                        )}
                      </div>
                      {!n.read && (
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0 mt-1.5" />
                      )}
                    </button>
                  )
                })}
              </div>

            </div>
          )}
        </div>

        {/* Settings gear */}
        <div className="relative" ref={settingsRef}>
        <button
          onClick={() => { setSettingsOpen(v => !v); setNotifOpen(false) }}
          title="Settings"
          className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors ${
            settingsOpen
              ? 'bg-purple-100 text-purple-700'
              : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
          }`}>
          <Settings className="w-4 h-4" />
        </button>

        {/* Settings dropdown */}
        {settingsOpen && (
          <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Settings className="w-3.5 h-3.5 text-purple-600" />
                <span className="text-sm font-semibold text-gray-800">Settings</span>
              </div>
              <button onClick={() => setSettingsOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-0.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-3 space-y-4">

              {/* Appearance */}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Appearance</p>

                {/* Dark mode row */}
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    {darkMode
                      ? <Moon className="w-4 h-4 text-purple-400" />
                      : <Sun className="w-4 h-4 text-amber-400" />}
                    <span className="text-sm text-gray-700">Dark Mode</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDarkMode(!darkMode)}
                    className={`relative inline-flex w-9 h-5 rounded-full transition-all duration-200 flex-shrink-0 ${
                      darkMode ? 'bg-purple-600' : 'bg-gray-200'
                    }`}>
                    <span
                      className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full shadow-sm transition-transform duration-200"
                      style={{ background: 'white', transform: darkMode ? 'translateX(16px)' : 'translateX(0)' }}
                    />
                  </button>
                </div>

                {/* Font size slider */}
                <div className="px-3 pt-2 pb-2">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <Type className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs font-medium text-gray-600">Text Size</span>
                    </div>
                    <span className="text-[11px] font-semibold text-purple-600 tabular-nums">
                      {sliderVal}%
                    </span>
                  </div>

                  {/* A … AA with smooth slider */}
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="text-[10px] font-bold text-gray-400 flex-shrink-0 select-none w-5 text-center">A</span>
                    <input
                      type="range"
                      min="50"
                      max="200"
                      step="1"
                      value={sliderVal}
                      onChange={e => {
                        const v = Number(e.target.value)
                        setSliderVal(v)
                        document.documentElement.style.setProperty('--rr-fs', String(v / 100))
                      }}
                      className="flex-1 cursor-pointer"
                      style={{ accentColor: '#7c3aed' }}
                    />
                    <span className="text-[16px] font-bold text-gray-400 flex-shrink-0 select-none w-5 text-center">A</span>
                  </div>

                  {/* Range hint */}
                  <div className="flex justify-between px-5 mb-3">
                    <span className="text-[9px] text-gray-300 select-none">50%</span>
                    <span className="text-[9px] text-gray-300 select-none">100%</span>
                    <span className="text-[9px] text-gray-300 select-none">200%</span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setSliderVal(100)
                        document.documentElement.style.setProperty('--rr-fs', '1')
                      }}
                      className="text-[10px] text-gray-400 hover:text-purple-600 transition-colors">
                      Reset
                    </button>
                    <button
                      onClick={() => {
                        setFontSize(sliderVal)
                        setSettingsOpen(false)
                      }}
                      className="px-4 py-1.5 text-[11px] font-semibold text-white rounded-lg transition-opacity hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
                      Apply
                    </button>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Account */}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Account</p>

                <Link to="/profile" onClick={() => setSettingsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
                  <UserCircle className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors flex-shrink-0" />
                  <span className="text-sm text-gray-700 flex-1">Edit Profile</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-purple-400 transition-colors flex-shrink-0" />
                </Link>

                {user?.role === 'admin' && (
                  <Link to="/admin/users" onClick={() => setSettingsOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
                    <Users className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors flex-shrink-0" />
                    <span className="text-sm text-gray-700 flex-1">Access Management</span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-purple-400 transition-colors flex-shrink-0" />
                  </Link>
                )}
              </div>

            </div>
          </div>
        )}
        </div>

        {/* User profile button + dropdown */}
        <div className="relative ml-1" ref={userRef}>
          <button
            onClick={() => { setUserOpen(v => !v); setNotifOpen(false); setSettingsOpen(false) }}
            className={`flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl transition-colors ${
              userOpen ? 'bg-purple-50' : 'hover:bg-gray-100'
            }`}>
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-transparent">
              {avatarData?.type === 'photo' && avatarData.data ? (
                <img src={avatarData.data} alt="Profile" className="w-8 h-8 object-cover" />
              ) : avatarData?.type === 'preset' ? (
                <ScaledAvatar tone={avatarData.tone} hair={avatarData.hair} gender={avatarData.gender} hairColor={avatarData.hairColor} size={32} />
              ) : (
                <div className="w-8 h-8 flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
                  {user?.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
            </div>
            {/* Name + email */}
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold text-gray-800 leading-tight truncate max-w-[110px]">{user?.name}</p>
              {user?.email && <p className="text-[10px] text-gray-400 leading-tight truncate max-w-[110px]">{user.email}</p>}
            </div>
            <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform flex-shrink-0 ${userOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown panel */}
          {userOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden">

              {/* Header */}
              <div className="px-4 py-3 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
                <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-white/30">
                  {avatarData?.type === 'photo' && avatarData.data ? (
                    <img src={avatarData.data} alt="Profile" className="w-9 h-9 object-cover" />
                  ) : avatarData?.type === 'preset' ? (
                    <ScaledAvatar tone={avatarData.tone} hair={avatarData.hair} gender={avatarData.gender} hairColor={avatarData.hairColor} size={36} />
                  ) : (
                    <div className="w-9 h-9 flex items-center justify-center text-white text-sm font-bold bg-white/20">
                      {user?.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{user?.name}</p>
                  {user?.email && <p className="text-purple-200/70 text-xs truncate">{user.email}</p>}
                  {user?.role && <p className="text-purple-200/50 text-[10px] capitalize">{user.role}</p>}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-100">
                {['account', 'portals'].map(tab => (
                  <button key={tab} onClick={() => setUserTab(tab)}
                    className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
                      userTab === tab ? 'text-purple-700 border-b-2 border-purple-600' : 'text-gray-400 hover:text-gray-600'
                    }`}>
                    {tab === 'portals' ? 'Portals' : 'Account'}
                  </button>
                ))}
              </div>

              {/* Account tab */}
              {userTab === 'account' && (
                <div className="p-3 space-y-2 max-h-72 overflow-y-auto">
                  <Link to="/profile" onClick={() => setUserOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-purple-50 transition-colors group">
                    <UserCircle className="w-4 h-4 text-gray-400 group-hover:text-purple-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700 flex-1 font-medium">Edit Profile</span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-purple-400 flex-shrink-0" />
                  </Link>
                  {user?.role === 'admin' && (
                    <Link to="/admin/users" onClick={() => setUserOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-purple-50 transition-colors group">
                      <Users className="w-4 h-4 text-gray-400 group-hover:text-purple-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700 flex-1 font-medium">Access Management</span>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-purple-400 flex-shrink-0" />
                    </Link>
                  )}

                  {/* Outlook */}
                  <div className="border border-gray-100 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Mail className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                      <span className="text-xs font-medium text-gray-800 flex-1">Outgoing Email</span>
                      {msConnected
                        ? <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />Connected</span>
                        : <span className="text-[10px] text-gray-400">Not connected</span>}
                    </div>
                    {msConnected ? (
                      <div className="flex items-center justify-between bg-emerald-50 rounded-lg px-2.5 py-1.5">
                        <span className="text-[10px] text-emerald-700 font-medium">Outlook connected</span>
                        <button onClick={async () => { await msGraphApi.disconnect(); setMsConnected(false) }}
                          className="text-red-400 hover:text-red-600 ml-1" title="Disconnect">
                          <Link2Off className="w-3 h-3" />
                        </button>
                      </div>
                    ) : !msConfigured ? (
                      <p className="text-[10px] text-amber-600 bg-amber-50 rounded-lg px-2.5 py-1.5">
                        Microsoft OAuth not configured.
                      </p>
                    ) : (
                      <button disabled={msConnecting}
                        onClick={async () => {
                          setMsConnecting(true)
                          try { const r = await msGraphApi.authorizeUrl(); window.location.href = r.data.url }
                          catch { setMsConnecting(false) }
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-[#0078d4] hover:bg-[#106ebe] disabled:opacity-50 text-white text-[11px] font-medium rounded-lg transition-colors">
                        <Mail className="w-3 h-3" />{msConnecting ? 'Redirecting…' : 'Connect Outlook'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Portals tab */}
              {userTab === 'portals' && (
                <div className="p-3 space-y-2 max-h-72 overflow-y-auto">
                  {/* LinkedIn */}
                  <div className="border border-gray-100 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center text-white flex-shrink-0">{LI_ICON}</div>
                      <span className="text-xs font-medium text-gray-800 flex-1">LinkedIn</span>
                      {liAccounts.length > 0
                        ? <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />Connected</span>
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
                        ? <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />Active</span>
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
                        <p className="text-[10px] text-gray-500">Log into resdex.naukri.com → F12 → copy as cURL</p>
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

              {/* Logout */}
              <div className="border-t border-gray-100">
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

    </header>
  )
}
