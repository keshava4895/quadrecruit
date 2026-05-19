import { useState, useEffect, useRef } from 'react'
import { searchApi, jobsApi, candidatesApi, emailApi } from '../api'
import {
  Search, MapPin, Briefcase, ExternalLink,
  ChevronDown, Star, Loader2, AlertCircle,
  Upload, FileText, CheckCircle, XCircle, FolderOpen,
  Mail, X, Copy,
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

function MailModal({ candidate, jobTitle, onClose }) {
  const [to,      setTo]      = useState(candidate?.email || '')
  const [subject, setSubject] = useState('')
  const [body,    setBody]    = useState('')
  const [loading, setLoading] = useState(true)
  const [copied,  setCopied]  = useState(false)

  useEffect(() => {
    emailApi.draft(candidate.name, jobTitle || 'the role')
      .then(r => { setSubject(r.data.subject); setBody(r.data.body) })
      .catch(() => { setSubject('Exciting Opportunity for You'); setBody('') })
      .finally(() => setLoading(false))
  }, [])

  const handleCopy = () => {
    navigator.clipboard.writeText(`To: ${to}\nSubject: ${subject}\n\n${body}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-sm font-semibold text-zinc-900">Send outreach email</p>
            <p className="text-xs text-zinc-400 mt-0.5">to {candidate.name}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-zinc-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Drafting email…</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">To</label>
              <input type="email" value={to} onChange={e => setTo(e.target.value)}
                placeholder="candidate@email.com" className={INPUT + ' w-full'} />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Subject</label>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                className={INPUT + ' w-full'} />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Body</label>
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={8}
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleCopy}
                className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors">
                {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <a href={`mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
                className="flex items-center gap-1.5 px-4 py-2 border border-zinc-200 text-zinc-700 text-sm font-medium rounded-lg hover:border-zinc-400 transition-colors">
                <Mail className="w-3.5 h-3.5" />
                Open in Mail
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function BulkMailModal({ candidates, jobTitle, onClose }) {
  const [drafts,   setDrafts]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [sent,     setSent]     = useState({})

  useEffect(() => {
    emailApi.bulkDraft(
      candidates.map(c => ({ name: c.name, email: c.email, phone: c.phone })),
      jobTitle
    )
      .then(r => setDrafts(r.data.drafts))
      .catch(() => setDrafts(candidates.map(c => ({
        name: c.name, email: c.email, phone: c.phone,
        subject: 'Exciting Opportunity', body: '',
      }))))
      .finally(() => setLoading(false))
  }, [])

  const handleSend = (draft, i) => {
    window.open(`mailto:${draft.email}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`)
    setSent(s => ({ ...s, [i]: true }))
  }

  const sendableCount = drafts.filter(d => d.email).length
  const sentCount     = Object.keys(sent).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <div>
            <p className="text-sm font-semibold text-zinc-900">Bulk Outreach Email</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} · AI-drafted · replies auto-classified
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-zinc-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Drafting emails for {candidates.length} candidate{candidates.length !== 1 ? 's' : ''}…</span>
            </div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {drafts.map((d, i) => (
                <div key={i} className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-semibold text-zinc-600 flex-shrink-0">
                      {d.name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900">{d.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {d.email && <span className="text-xs text-zinc-400">{d.email}</span>}
                        {d.phone && <span className="text-xs text-zinc-400">{d.phone}</span>}
                        {!d.email && <span className="text-xs text-amber-500">No email found</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => setExpanded(expanded === i ? null : i)}
                        className="text-xs text-zinc-500 hover:text-zinc-800 px-2 py-1 rounded border border-zinc-200 hover:border-zinc-400 transition-colors">
                        {expanded === i ? 'Hide' : 'Preview'}
                      </button>
                      {d.email ? (
                        <button onClick={() => handleSend(d, i)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            sent[i]
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-zinc-900 text-white hover:bg-zinc-700'
                          }`}>
                          {sent[i] ? <CheckCircle className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
                          {sent[i] ? 'Opened' : 'Send'}
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-300 px-3 py-1.5">No email</span>
                      )}
                    </div>
                  </div>

                  {expanded === i && (
                    <div className="mt-3 ml-11 space-y-2">
                      <div>
                        <p className="text-[11px] font-medium text-zinc-400 mb-1">Subject</p>
                        <p className="text-xs text-zinc-700 bg-zinc-50 rounded-lg px-3 py-2">{d.subject}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-zinc-400 mb-1">Body</p>
                        <p className="text-xs text-zinc-700 bg-zinc-50 rounded-lg px-3 py-2 whitespace-pre-wrap leading-relaxed">{d.body}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {!loading && (
          <div className="px-6 py-4 border-t border-zinc-100 flex items-center justify-between">
            <p className="text-xs text-zinc-400">
              {sentCount} of {sendableCount} opened in mail client
            </p>
            <button
              onClick={() => drafts.forEach((d, i) => { if (d.email && !sent[i]) handleSend(d, i) })}
              disabled={sendableCount === 0 || sentCount === sendableCount}
              className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 disabled:opacity-40 transition-colors">
              <Mail className="w-3.5 h-3.5" />
              Send All ({sendableCount})
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

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

function CandidateCard({ candidate, onSendMail }) {
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

      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2 mb-3">{candidate.summary}</p>

      <button
        onClick={() => onSendMail(candidate)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-600 border border-zinc-200 rounded-lg hover:border-zinc-400 hover:text-zinc-900 transition-colors w-full justify-center"
      >
        <Mail className="w-3.5 h-3.5" />
        Send Mail
      </button>
    </div>
  )
}

export default function Candidates() {
  const [portals,       setPortals]       = useState(['linkedin'])
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
  const [mailTarget,    setMailTarget]    = useState(null)
  const [showBulkMail,  setShowBulkMail]  = useState(false)
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

  const togglePortal = (value) =>
    setPortals(prev => prev.includes(value)
      ? prev.length > 1 ? prev.filter(x => x !== value) : prev
      : [...prev, value]
    )

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
          out.push({ fileName: file.name, status: 'success', ...r.data })
        } catch (err) {
          out.push({ fileName: file.name, status: 'error', error: err.message })
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
      const all = []
      for (const p of portals) {
        const res = await searchApi.candidates({
          portal: p,
          query:          searchMode === 'custom' ? query.trim() : '',
          job_id:         searchMode === 'job'    ? selectedJobId : null,
          location:       location.trim() || null,
          experience_min: expMin !== '' ? parseInt(expMin) : 0,
          experience_max: expMax !== '' ? parseInt(expMax) : 20,
          limit: 10,
        })
        res.data.candidates.forEach(c => all.push({ ...c, _portal: p }))
      }
      const seen = new Map()
      for (const c of all) {
        if (!seen.has(c.name) || c.match_score > seen.get(c.name).match_score) seen.set(c.name, c)
      }
      const merged = [...seen.values()].sort((a, b) => b.match_score - a.match_score)
      setResults({ total: merged.length, candidates: merged })
    } catch (err) {
      setError(err.response?.data?.detail || 'Search failed. Please try again.')
    } finally { setLoading(false) }
  }

  const isResumeMode = searchMode === 'resume'

  const activeJobId    = searchMode === 'job' ? selectedJobId : searchMode === 'resume' ? resumeJobId : null
  const activeJobTitle = jobs.find(j => j.jobId === activeJobId)?.title || ''

  return (
    <div className="page">

      {mailTarget && (
        <MailModal candidate={mailTarget} jobTitle={activeJobTitle} onClose={() => setMailTarget(null)} />
      )}

      {showBulkMail && resumeResults && (
        <BulkMailModal
          candidates={resumeResults.filter(r => r.status === 'success')}
          jobTitle={activeJobTitle}
          onClose={() => setShowBulkMail(false)}
        />
      )}

      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Find Candidates</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Search talent across job portals or screen local resumes</p>
        </div>

        {/* Send Mail button — always visible in Browse Local mode */}
        {isResumeMode && (() => {
          const successCount = resumeResults?.filter(r => r.status === 'success').length ?? 0
          const hasResults   = successCount > 0
          return (
            <button
              onClick={() => hasResults && setShowBulkMail(true)}
              disabled={!hasResults}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                hasResults
                  ? 'bg-zinc-900 text-white hover:bg-zinc-700 cursor-pointer'
                  : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
              }`}
            >
              <Mail className="w-4 h-4" />
              Send Mail{hasResults ? ` (${successCount})` : ''}
            </button>
          )
        })()}

        {/* Portal picker — hidden in resume mode */}
        {!isResumeMode && (
          <div className="relative" ref={portalRef}>
            <button
              onClick={() => setPortalOpen(v => !v)}
              className="flex items-center gap-2 px-3.5 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-700 hover:border-zinc-400 transition-colors"
            >
              <div className="flex items-center gap-1">
                {portals.slice(0, 3).map(v => (
                  <span key={v} className={`w-2 h-2 rounded-full flex-shrink-0 ${PORTALS.find(p => p.value === v)?.dot}`} />
                ))}
              </div>
              {portals.length === 1 ? PORTALS.find(p => p.value === portals[0])?.label : `${portals.length} portals`}
              <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${portalOpen ? 'rotate-180' : ''}`} />
            </button>
            {portalOpen && (
              <div className="absolute right-0 mt-1.5 w-44 bg-white border border-zinc-200 rounded-xl shadow-lg py-1 z-20">
                {PORTALS.map(p => (
                  <button key={p.value} onClick={() => togglePortal(p.value)}
                    className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm text-left transition-colors ${
                      portals.includes(p.value) ? 'text-zinc-900 font-semibold bg-zinc-50' : 'text-zinc-600 hover:bg-zinc-50'
                    }`}>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${p.dot}`} />
                    <span className="flex-1">{p.label}</span>
                    {portals.includes(p.value) && <span className="text-zinc-500 text-xs">✓</span>}
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
            <><Search className="w-4 h-4" /> Search {portals.length === 1 ? PORTALS.find(p => p.value === portals[0])?.label : `${portals.length} Portals`}</>
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
              <div key={i} className="flex items-center gap-3 px-5 py-4">
                {r.status === 'success'
                  ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  : <XCircle    className="w-4 h-4 text-red-400 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 truncate">
                    {r.status === 'success' ? (r.name || r.fileName) : r.fileName}
                  </p>
                  {r.status === 'success' ? (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                      {r.email && (
                        <span className="text-xs text-zinc-400 flex items-center gap-1">
                          <Mail className="w-3 h-3" />{r.email}
                        </span>
                      )}
                      {r.phone && (
                        <span className="text-xs text-zinc-400">{r.phone}</span>
                      )}
                      {!r.email && <span className="text-xs text-amber-500">No email extracted</span>}
                    </div>
                  ) : (
                    <p className="text-xs text-red-500 mt-0.5">{r.error}</p>
                  )}
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
              {portals.map(v => (
                <span key={v} className={`w-2 h-2 rounded-full ${PORTALS.find(p => p.value === v)?.dot}`} />
              ))}
              via {portals.length === 1 ? PORTALS.find(p => p.value === portals[0])?.label : `${portals.length} portals`}
            </span>
          </div>
          {results.candidates.length === 0 ? (
            <div className="text-center py-16 text-zinc-400">
              <Search className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No candidates matched. Try broader requirements.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {results.candidates.map((c, i) => <CandidateCard key={i} candidate={c} onSendMail={setMailTarget} />)}
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
