import { useState, useRef, useEffect, useCallback } from 'react'
import QlogoLoader from '../components/QlogoLoader'
import { useNavigate, useLocation } from 'react-router-dom'
import { Search, Briefcase, User, X, ArrowRight } from 'lucide-react'
import { candidatesApi, jobsApi } from '../api'

const PAGE_LABELS = {
  '/dashboard':          'Dashboard',
  '/jobs':               'Jobs',
  '/candidates':         'Talent Search',
  '/pipeline':           'Pipeline',
  '/analytics':          'Analytics',
  '/candidate-database': 'Talent Pool',
  '/upload':             'Resume Scorer',
  '/interviewers':       'Interviewers',
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

  const [query,   setQuery]   = useState('')
  const [focused, setFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState({ jobs: [], candidates: [] })

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

  // Close on outside click
  useEffect(() => {
    function onOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setFocused(false)
      }
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

  const hasResults = results.jobs.length > 0 || results.candidates.length > 0
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

          {/* Dropdown */}
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

              {/* Footer hint */}
              <div className="border-t border-gray-50 px-4 py-2 flex items-center justify-between">
                <p className="text-[10px] text-gray-300">Press <kbd className="font-mono bg-gray-100 px-1 rounded">↵</kbd> to select</p>
                <p className="text-[10px] text-gray-300"><kbd className="font-mono bg-gray-100 px-1 rounded">Esc</kbd> to close</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Spacer to balance layout */}
      <div className="min-w-[80px]" />
    </header>
  )
}

