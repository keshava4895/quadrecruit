import { useState, useEffect, useRef } from 'react'
import { searchApi, jobsApi, candidatesApi } from '../api'
import {
  Search, MapPin, Briefcase, ExternalLink,
  ChevronDown, Star, Loader2, AlertCircle,
  Upload, FileText, CheckCircle, XCircle, FolderOpen,
} from 'lucide-react'

const PORTALS = [
  { value: 'linkedin',  label: 'LinkedIn',  dot: 'bg-blue-600' },
  { value: 'indeed',    label: 'Indeed',    dot: 'bg-sky-500' },
  { value: 'naukri',    label: 'Naukri',    dot: 'bg-orange-500' },
  { value: 'monster',   label: 'Monster',   dot: 'bg-purple-500' },
  { value: 'glassdoor', label: 'Glassdoor', dot: 'bg-emerald-500' },
]

const AVAIL_STYLE = {
  'Immediately Available': 'bg-emerald-50 text-emerald-700',
  '2 Weeks Notice':        'bg-blue-50 text-blue-700',
  '1 Month Notice':        'bg-amber-50 text-amber-700',
  '2 Months Notice':       'bg-orange-50 text-orange-700',
  '3 Months Notice':       'bg-red-50 text-red-600',
}

const INPUT = 'border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition'
const SELECT = 'w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition'

function ScoreBar({ score }) {
  const pct   = Math.round(score * 100)
  const color = pct >= 85 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-zinc-700 w-7 text-right">{pct}%</span>
    </div>
  )
}

function CandidateCard({ candidate }) {
  const avail        = AVAIL_STYLE[candidate.availability] || 'bg-zinc-100 text-zinc-500'
  const skills       = candidate.skills?.slice(0, 5) ?? []
  const extraSkills  = (candidate.skills?.length ?? 0) - 5

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5 hover:border-zinc-300 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-zinc-600">
            {candidate.name?.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900 leading-tight truncate">{candidate.name}</p>
            <p className="text-xs text-zinc-400 leading-tight truncate">{candidate.headline}</p>
          </div>
        </div>
        <a href={candidate.profile_url} target="_blank" rel="noopener noreferrer"
          className="text-zinc-300 hover:text-zinc-600 transition-colors flex-shrink-0 mt-0.5">
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="mb-3">
        <p className="text-[11px] text-zinc-400 mb-1.5 flex items-center gap-1">
          <Star className="w-3 h-3" /> Match score
        </p>
        <ScoreBar score={candidate.match_score} />
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-400 mb-3">
        {candidate.location && (
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{candidate.location}</span>
        )}
        <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{candidate.experience_years}y exp</span>
        {candidate.availability && (
          <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${avail}`}>
            {candidate.availability}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {skills.map(s => (
          <span key={s} className="px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded text-xs">{s}</span>
        ))}
        {extraSkills > 0 && <span className="px-1.5 py-0.5 text-zinc-400 text-xs">+{extraSkills}</span>}
      </div>

      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">{candidate.summary}</p>
    </div>
  )
}

export default function Candidates() {
  const [portal,        setPortal]        = useState('linkedin')
  const [portalOpen,    setPortalOpen]    = useState(false)
  const [searchMode,    setSearchMode]    = useState('custom')
  const [query,         setQuery]         = useState('')
  const [selectedJobId, setSelectedJobId] = useState('')
  const [location,      setLocation]      = useState('')
  const [expMin,        setExpMin]        = useState('')
  const [expMax,        setExpMax]        = useState('')
  const [jobs,          setJobs]          = useState([])
  const [results,       setResults]       = useState(null)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')
  const portalRef = useRef(null)

  // Resume browse state
  const [resumeFiles,   setResumeFiles]   = useState([])
  const [resumeJobId,   setResumeJobId]   = useState('')
  const [resumeResults, setResumeResults] = useState(null)
  const [dragOver,      setDragOver]      = useState(false)

  useEffect(() => { jobsApi.list().then(r => setJobs(r.data)).catch(() => {}) }, [])

  useEffect(() => {
    const close = e => { if (portalRef.current && !portalRef.current.contains(e.target)) setPortalOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const selectedPortal = PORTALS.find(p => p.value === portal)

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.pdf') || f.name.endsWith('.txt'))
    if (dropped.length) setResumeFiles(dropped)
  }

  async function handleSearch(e) {
    e.preventDefault()
    setError('')

    if (searchMode === 'resume') {
      if (!resumeJobId) { setError('Select a job to screen resumes against.'); return }
      if (resumeFiles.length === 0) { setError('Add at least one resume file.'); return }
      setLoading(true)
      setResumeResults(null)
      const out = []
      for (const file of resumeFiles) {
        try {
          const r = await candidatesApi.uploadResume(resumeJobId, file)
          out.push({ name: file.name, status: 'success', ...r.data })
        } catch (err) {
          out.push({ name: file.name, status: 'error', error: err.message })
        }
      }
      setResumeResults(out)
      setLoading(false)
      return
    }

    const hasQuery = searchMode === 'custom' ? query.trim() : selectedJobId
    if (!hasQuery) { setError(searchMode === 'custom' ? 'Enter search requirements.' : 'Select a job description.'); return }
    setLoading(true); setResults(null)
    try {
      const res = await searchApi.candidates({
        portal,
        query:          searchMode === 'custom' ? query.trim() : '',
        job_id:         searchMode === 'job'    ? selectedJobId : null,
        location:       location.trim() || null,
        experience_min: expMin !== '' ? parseInt(expMin) : 0,
        experience_max: expMax !== '' ? parseInt(expMax) : 20,
        limit: 10,
      })
      setResults(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Search failed. Please try again.')
    } finally { setLoading(false) }
  }

  const isResumeMode = searchMode === 'resume'

  return (
    <div className="page">

      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Find Candidates</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Search talent across job portals or screen local resumes</p>
        </div>

        {/* Portal picker — hidden in resume mode */}
        {!isResumeMode && (
          <div className="relative" ref={portalRef}>
            <button
              onClick={() => setPortalOpen(v => !v)}
              className="flex items-center gap-2 px-3.5 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-700 hover:border-zinc-400 transition-colors"
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${selectedPortal.dot}`} />
              {selectedPortal.label}
              <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${portalOpen ? 'rotate-180' : ''}`} />
            </button>
            {portalOpen && (
              <div className="absolute right-0 mt-1.5 w-40 bg-white border border-zinc-200 rounded-xl shadow-lg py-1 z-20">
                {PORTALS.map(p => (
                  <button key={p.value} onClick={() => { setPortal(p.value); setPortalOpen(false) }}
                    className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm text-left transition-colors ${
                      p.value === portal ? 'text-zinc-900 font-semibold bg-zinc-50' : 'text-zinc-600 hover:bg-zinc-50'
                    }`}>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${p.dot}`} />
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search panel */}
      <form onSubmit={handleSearch} className="bg-white border border-zinc-200 rounded-xl p-5 mb-6">

        {/* Mode toggle */}
        <div className="flex gap-0.5 p-0.5 bg-zinc-100 rounded-lg w-fit mb-4">
          {[
            ['custom', 'Type Requirements'],
            ['job',    'Select Job'],
            ['resume', 'Browse Local'],
          ].map(([mode, label]) => (
            <button key={mode} type="button" onClick={() => { setSearchMode(mode); setError('') }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                searchMode === mode ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              }`}>
              {mode === 'resume' && <FolderOpen className="w-3.5 h-3.5" />}
              {label}
            </button>
          ))}
        </div>

        {/* ── Portal search modes ── */}
        {searchMode === 'custom' && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-3.5 w-4 h-4 text-zinc-400" />
            <textarea value={query} onChange={e => setQuery(e.target.value)} rows={3}
              placeholder="e.g. Senior React developer with Node.js, 5+ years, fintech experience…"
              className="w-full pl-10 pr-4 py-3 border border-zinc-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition" />
          </div>
        )}

        {searchMode === 'job' && (
          <div className="mb-4">
            <select value={selectedJobId} onChange={e => setSelectedJobId(e.target.value)}
              className={SELECT}>
              <option value="">— Select a job description —</option>
              {jobs.map(j => <option key={j.jobId} value={j.jobId}>{j.title} ({j.jobId})</option>)}
            </select>
          </div>
        )}

        {/* ── Resume browse mode ── */}
        {searchMode === 'resume' && (
          <div className="mb-4 space-y-3">
            {/* Job selector */}
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Screen against job</label>
              <select value={resumeJobId} onChange={e => setResumeJobId(e.target.value)} className={SELECT}>
                <option value="">— Select a job description —</option>
                {jobs.map(j => <option key={j.jobId} value={j.jobId}>{j.title} ({j.jobId})</option>)}
              </select>
            </div>

            {/* Drop zone */}
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Resume files</label>
              <label
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-8 cursor-pointer transition-colors ${
                  dragOver ? 'border-zinc-400 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <Upload className={`w-6 h-6 mb-2 transition-colors ${dragOver ? 'text-zinc-600' : 'text-zinc-300'}`} />
                <p className="text-sm font-medium text-zinc-500">
                  Drop files here or <span className="text-zinc-900 underline underline-offset-2">browse</span>
                </p>
                <p className="text-xs text-zinc-400 mt-1">PDF or TXT files supported</p>
                <input type="file" multiple accept=".pdf,.txt" className="hidden"
                  onChange={e => setResumeFiles(Array.from(e.target.files))} />
              </label>

              {resumeFiles.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {resumeFiles.map(f => (
                    <li key={f.name} className="flex items-center gap-2 text-xs text-zinc-600 bg-zinc-50 rounded-lg px-3 py-2">
                      <FileText className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                      <span className="flex-1 truncate">{f.name}</span>
                      <span className="text-zinc-400 flex-shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Filters — only for portal modes */}
        {!isResumeMode && (
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex items-center gap-2 flex-1 min-w-[180px]">
              <MapPin className="w-4 h-4 text-zinc-400 flex-shrink-0" />
              <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                placeholder="Location (optional)" className={INPUT + ' flex-1'} />
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-zinc-400 flex-shrink-0" />
              <input type="number" value={expMin} onChange={e => setExpMin(e.target.value)}
                placeholder="Min" min={0} max={40} className={INPUT + ' w-16 text-center'} />
              <span className="text-zinc-300 text-sm">—</span>
              <input type="number" value={expMax} onChange={e => setExpMax(e.target.value)}
                placeholder="Max" min={0} max={40} className={INPUT + ' w-16 text-center'} />
              <span className="text-xs text-zinc-400">yrs</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}

        <button type="submit" disabled={loading}
          className="flex items-center gap-2 px-5 py-2 bg-zinc-900 hover:bg-zinc-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors">
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> {isResumeMode ? 'Screening…' : 'Searching…'}</>
          ) : isResumeMode ? (
            <><Upload className="w-4 h-4" /> Screen {resumeFiles.length || 0} Resume{resumeFiles.length !== 1 ? 's' : ''}</>
          ) : (
            <><Search className="w-4 h-4" /> Search {selectedPortal.label}</>
          )}
        </button>
      </form>

      {/* ── Resume screening results ── */}
      {isResumeMode && resumeResults && (
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100">
            <p className="text-sm font-semibold text-zinc-900">Screening Results</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {resumeResults.filter(r => r.status === 'success').length} of {resumeResults.length} processed successfully
            </p>
          </div>
          <div className="divide-y divide-zinc-50">
            {resumeResults.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                {r.status === 'success'
                  ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  : <XCircle    className="w-4 h-4 text-red-400 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 truncate">{r.name}</p>
                  {r.status === 'success'
                    ? <p className="text-xs text-zinc-400">{r.candidateId} · Match: {Math.round((r.match_score || 0) * 100)}%</p>
                    : <p className="text-xs text-red-500">{r.error}</p>}
                </div>
                {r.status === 'success' && (
                  <span className={`text-sm font-bold flex-shrink-0 ${
                    Math.round((r.match_score || 0) * 100) >= 80 ? 'text-emerald-600' :
                    Math.round((r.match_score || 0) * 100) >= 60 ? 'text-amber-600' : 'text-red-500'
                  }`}>
                    {Math.round((r.match_score || 0) * 100)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Portal search results ── */}
      {!isResumeMode && results && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-zinc-900">
              {results.total} candidate{results.total !== 1 ? 's' : ''} found
            </p>
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <span className={`w-2 h-2 rounded-full ${selectedPortal.dot}`} />
              via {selectedPortal.label}
            </span>
          </div>
          {results.candidates.length === 0 ? (
            <div className="text-center py-16 text-zinc-400">
              <Search className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No candidates matched. Try broader requirements.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {results.candidates.map((c, i) => <CandidateCard key={i} candidate={c} />)}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!results && !resumeResults && !loading && (
        <div className="text-center py-24">
          <Search className="w-10 h-10 text-zinc-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-500">
            {isResumeMode ? 'Upload resumes to screen candidates' : 'Search for candidates'}
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            {isResumeMode
              ? 'Select a job, add resume files, then click Screen.'
              : 'Choose a portal, enter requirements or a job description, then search.'}
          </p>
        </div>
      )}

    </div>
  )
}
