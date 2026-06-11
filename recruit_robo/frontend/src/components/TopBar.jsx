import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import QlogoLoader from '../components/QlogoLoader'
import {
  Search, Briefcase, X, ArrowRight,
  Settings, Moon, Sun, Type, UserCircle, Users, Bell,
  Calendar, FileText, CheckCircle, XCircle, Activity, RefreshCw,
} from 'lucide-react'
import { candidatesApi, jobsApi } from '../api'
import { useSettings } from '../context/SettingsContext'
import { useAuth } from '../context/AuthContext'
import { useNotifications, timeAgo } from '../context/NotificationsContext'

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
  const { user } = useAuth()
  const { notifications, loading: nLoading, unreadCount, markAllRead, markRead, refresh: refreshNotifs } = useNotifications()

  const FONT_KEYS   = ['xs', 'small', 'medium', 'large', 'xl']
  const FONT_LABELS = ['XS', 'S', 'M', 'L', 'XL']
  const FONT_PX     = { xs: '12px', small: '14px', medium: '16px', large: '18px', xl: '20px' }

  const [query,        setQuery]        = useState('')
  const [focused,      setFocused]      = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [results,      setResults]      = useState({ jobs: [], candidates: [] })
  const [settingsOpen, setSettingsOpen]     = useState(false)
  const [notifOpen,    setNotifOpen]        = useState(false)
  const [sliderVal,    setSliderVal]        = useState(() => Math.max(0, FONT_KEYS.indexOf(fontSize)))

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
                    <span className="text-[10px] text-gray-400 font-medium">
                      {['Extra Small','Small','Medium','Large','Extra Large'][sliderVal]}
                    </span>
                  </div>

                  {/* AA … A with slider */}
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="text-[10px] font-bold text-gray-400 flex-shrink-0 select-none w-6 text-center">AA</span>
                    <input
                      type="range"
                      min="0"
                      max="4"
                      step="1"
                      value={sliderVal}
                      onChange={e => {
                        const v = Number(e.target.value)
                        setSliderVal(v)
                        // live preview — update DOM immediately, don't save yet
                        document.documentElement.style.fontSize = FONT_PX[FONT_KEYS[v]]
                      }}
                      className="flex-1 cursor-pointer"
                      style={{ accentColor: '#7c3aed' }}
                    />
                    <span className="text-[16px] font-bold text-gray-400 flex-shrink-0 select-none w-6 text-center">A</span>
                  </div>

                  {/* Tick labels */}
                  <div className="flex justify-between px-8 mb-3">
                    {FONT_LABELS.map((l, i) => (
                      <span key={l}
                        className={`text-[9px] font-medium select-none transition-colors ${
                          sliderVal === i ? 'text-purple-600' : 'text-gray-300'
                        }`}>
                        {l}
                      </span>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setFontSize(FONT_KEYS[sliderVal])
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

      </div>

    </header>
  )
}
