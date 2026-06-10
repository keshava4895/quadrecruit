import { useState, useEffect, useRef } from 'react'
import QlogoLoader from '../components/QlogoLoader'
import { useAuth } from '../context/AuthContext'
import { searchApi, jobsApi, candidatesApi, emailApi, linkedinApi } from '../api'
import {
  Search, MapPin, Briefcase, ExternalLink,
  ChevronDown, Star, AlertCircle,
  Upload, FileText, CheckCircle, XCircle, FolderOpen,
  Mail, X, Settings, Trash2, Bookmark, BookmarkCheck,
} from 'lucide-react'

const PORTALS = [
  { value: 'linkedin',  label: 'LinkedIn',  dot: 'bg-blue-600' },
  { value: 'indeed',    label: 'Indeed',    dot: 'bg-sky-500' },
  { value: 'naukri',    label: 'Naukri',    dot: 'bg-orange-500' },
  { value: 'monster',   label: 'Monster',   dot: 'bg-purple-500' },
  { value: 'glassdoor', label: 'Glassdoor', dot: 'bg-emerald-500' },
  { value: 'github',    label: 'GitHub',    dot: 'bg-gray-900' },
]

const AVAIL_STYLE = {
  'Immediately Available': 'bg-emerald-50 text-emerald-700',
  '2 Weeks Notice':        'bg-blue-50 text-blue-700',
  '1 Month Notice':        'bg-amber-50 text-amber-700',
  '2 Months Notice':       'bg-orange-50 text-orange-700',
  '3 Months Notice':       'bg-red-50 text-red-600',
}

const INPUT = 'border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition'
const SELECT = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition'

function buildTemplate(candidate, job, user) {
  const title    = job?.title    || '[Job Title]'
  const location = job?.location || '[Location]'
  const expRange = job?.experience_years ? `${job.experience_years}+ Years` : '[X–Y Years]'
  const skills   = (job?.skills || []).join(', ') || '[Key Skills]'
  const sender   = user?.name  || '[Your Name]'
  const email    = user?.email || '[Email Address]'

  const roleDesc = job?.description?.trim() ||
    `We are looking for a ${title} with ${expRange} of experience. ` +
    `The ideal candidate should have expertise in ${skills || 'the relevant technical areas'}` +
    (location && location !== '[Location]' ? ` and will be based in ${location}.` : '.')

  return {
    subject: `Exciting Job Opportunity – ${title}`,
    body:
`Dear ${candidate.name},

I hope you are doing well.

We came across your profile and were impressed by your experience and skills. We currently have an exciting opportunity for the position of ${title}, and we believe your background could be a great fit for this role.

About the Role:
${roleDesc}

Job Details:

Position: ${title}
Location: ${location}
Experience Required: ${expRange}
Employment Type: Full-Time
Skills Required: ${skills}

If you are interested in exploring this opportunity, please reply to this email with your updated resume and contact details. We would be happy to discuss the role and answer any questions you may have.

Looking forward to hearing from you.

Best Regards,
${sender}
Recruiter
${email}`,
  }
}

function MailModal({ candidate, job, onClose }) {
  const { user }  = useAuth()
  const template  = buildTemplate(candidate, job, user)
  const [to,      setTo]      = useState(candidate?.email || '')
  const [subject, setSubject] = useState(template.subject)
  const [body,    setBody]    = useState(template.body)
  const [sending, setSending] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  const handleSend = async () => {
    if (!to.trim()) return
    setSending(true)
    setError('')
    try {
      await emailApi.send(to.trim(), subject, body)
      setSent(true)
      setTimeout(() => { setSent(false); onClose() }, 2000)
    } catch (err) {
      const detail = err?.response?.data?.detail || 'Failed to send. Check SMTP settings in .env.'
      setError(detail)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-sm font-semibold text-gray-900">Send outreach email</p>
            <p className="text-xs text-gray-400 mt-0.5">to {candidate.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
              <input type="email" value={to} onChange={e => setTo(e.target.value)}
                placeholder="candidate@email.com" className={INPUT + ' w-full'} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                className={INPUT + ' w-full'} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Body</label>
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={8}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition" />
            </div>

            {!to.trim() && (
              <p className="text-xs text-amber-600">Enter the candidate's email address to send.</p>
            )}
            {error && (
              <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}
            {sent && (
              <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                Email sent successfully to {to}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSend}
                disabled={!to.trim() || sending || sent}
                className="flex items-center gap-1.5 px-5 py-2 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-all shadow-sm hover:shadow-md"
                style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}
              >
                {sending
                  ? <><QlogoLoader size={14} /> Sending…</>
                  : sent
                    ? <><CheckCircle className="w-3.5 h-3.5" /> Sent!</>
                    : <><Mail className="w-3.5 h-3.5" /> Send Mail</>
                }
              </button>
              <button onClick={onClose}
                className="px-5 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-xl transition-colors">
                Cancel
              </button>
            </div>
          </div>
      </div>
    </div>
  )
}

function BulkMailModal({ candidates, job, onClose }) {
  const { user }   = useAuth()
  const [drafts,   setDrafts]   = useState(() =>
    candidates.map(c => ({ ...buildTemplate(c, job, user), name: c.name, email: c.email || '' }))
  )
  const [expanded, setExpanded] = useState(null)
  const [sent,     setSent]     = useState({})
  const [sending,  setSending]  = useState({})

  const handleSend = async (draft, i) => {
    if (!draft.email) return
    setSending(s => ({ ...s, [i]: true }))
    try {
      await emailApi.send(draft.email, draft.subject, draft.body)
      setSent(s => ({ ...s, [i]: true }))
    } catch {
      // noop — individual modal shows error detail if needed
    } finally {
      setSending(s => ({ ...s, [i]: false }))
    }
  }

  const sendableCount = drafts.filter(d => d.email).length
  const sentCount     = Object.keys(sent).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-sm font-semibold text-gray-900">Bulk Send Mail</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} · template pre-filled · sent via SMTP
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="divide-y divide-gray-50">
            {drafts.map((d, i) => (
              <div key={i} className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600 flex-shrink-0">
                    {d.name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{d.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {d.email && <span className="text-xs text-gray-400">{d.email}</span>}
                      {!d.email && <span className="text-xs text-amber-500">No email found</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => setExpanded(expanded === i ? null : i)}
                      className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded border border-gray-200 hover:border-gray-400 transition-colors">
                      {expanded === i ? 'Hide' : 'Preview'}
                    </button>
                    {d.email ? (
                      <button onClick={() => handleSend(d, i)}
                        disabled={sending[i] || sent[i]}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition-colors disabled:opacity-40 ${
                          sent[i]
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'text-white'
                        }`}
                        style={!sent[i] ? { background: 'linear-gradient(135deg, #49029F, #7c3aed)' } : {}}>
                        {sent[i]
                          ? <><CheckCircle className="w-3.5 h-3.5" /> Sent</>
                          : sending[i]
                            ? <><QlogoLoader size={14} /> Sending…</>
                            : <><Mail className="w-3.5 h-3.5" /> Send</>
                        }
                      </button>
                    ) : (
                      <span className="text-xs text-gray-300 px-3 py-1.5">No email</span>
                    )}
                  </div>
                </div>

                {expanded === i && (
                  <div className="mt-3 ml-11 space-y-2">
                    <div>
                      <p className="text-[11px] font-medium text-gray-400 mb-1">Subject</p>
                      <p className="text-xs text-gray-700 bg-gray-50 rounded-lg px-3 py-2">{d.subject}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-gray-400 mb-1">Body</p>
                      <p className="text-xs text-gray-700 bg-gray-50 rounded-lg px-3 py-2 whitespace-pre-wrap leading-relaxed">{d.body}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {sentCount} of {sendableCount} sent
          </p>
          <button
            onClick={() => drafts.forEach((d, i) => { if (d.email && !sent[i] && !sending[i]) handleSend(d, i) })}
            disabled={sendableCount === 0 || sentCount === sendableCount}
            className="flex items-center gap-1.5 px-4 py-2 text-white text-sm font-medium rounded-xl disabled:opacity-40 transition-all shadow-sm hover:shadow-md"
            style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
            <Mail className="w-3.5 h-3.5" />
            Send All ({sendableCount})
          </button>
        </div>
      </div>
    </div>
  )
}

function ShortlistModal({ candidate, jobs, preselectedJobId, onClose, onShortlisted }) {
  const [jobId,   setJobId]   = useState(preselectedJobId || '')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  const handleShortlist = async () => {
    if (!jobId) { setError('Select a job first'); return }
    setSaving(true); setError('')
    try {
      await candidatesApi.add(jobId, {
        name:       candidate.name,
        email:      candidate.email || null,
        phone:      null,
        skills:     candidate.skills || [],
        experience: candidate.experience_years || 0,
        summary:    candidate.summary || candidate.headline || '',
      })
      onShortlisted(jobId)
      onClose()
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to shortlist candidate')
    } finally { setSaving(false) }
  }

  const selectedJob = jobs.find(j => j.jobId === jobId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">Shortlist Candidate</p>
            <p className="text-xs text-gray-400 mt-0.5">{candidate.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Add to Job *</label>
            <select value={jobId} onChange={e => setJobId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition">
              <option value="">— Select a job —</option>
              {jobs.map(j => <option key={j.jobId} value={j.jobId}>{j.title}</option>)}
            </select>
          </div>

          {selectedJob && (
            <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-xs text-gray-500 space-y-0.5">
              {selectedJob.location && <p className="flex items-center gap-1"><MapPin className="w-3 h-3" />{selectedJob.location}</p>}
              {selectedJob.experience_years && <p className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{selectedJob.experience_years}+ yrs experience required</p>}
              {selectedJob.skills?.length > 0 && <p>Skills: {selectedJob.skills.slice(0, 4).join(', ')}</p>}
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={handleShortlist} disabled={saving || !jobId}
              className="flex-1 py-2 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-all shadow-sm hover:shadow-md"
              style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
              {saving ? 'Shortlisting…' : 'Shortlist'}
            </button>
            <button onClick={onClose}
              className="flex-1 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-xl transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ScoreBar({ score }) {
  const pct   = Math.round(score * 100)
  const color = pct >= 85 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-7 text-right">{pct}%</span>
    </div>
  )
}

function CandidateCard({ candidate, onSendMail, onLinkedInMessage, onShortlist, shortlisted }) {
  const avail        = AVAIL_STYLE[candidate.availability] || 'bg-gray-100 text-gray-500'
  const skills       = candidate.skills?.slice(0, 5) ?? []
  const extraSkills  = (candidate.skills?.length ?? 0) - 5

  return (
    <div className={`bg-white border rounded-2xl p-5 hover:shadow-md transition-all ${shortlisted ? 'border-emerald-200 bg-emerald-50/20' : 'border-gray-100 hover:border-gray-200 shadow-sm'}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-gray-600">
            {candidate.name?.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 leading-tight truncate">{candidate.name}</p>
            <p className="text-xs text-gray-400 leading-tight truncate">{candidate.headline}</p>
          </div>
        </div>
        <a href={candidate.profile_url} target="_blank" rel="noopener noreferrer"
          className="text-gray-300 hover:text-gray-600 transition-colors flex-shrink-0 mt-0.5">
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="mb-3">
        <p className="text-[11px] text-gray-400 mb-1.5 flex items-center gap-1">
          <Star className="w-3 h-3" /> Match score
        </p>
        <ScoreBar score={candidate.match_score} />
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400 mb-3">
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
          <span key={s} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{s}</span>
        ))}
        {extraSkills > 0 && <span className="px-1.5 py-0.5 text-gray-400 text-xs">+{extraSkills}</span>}
      </div>

      <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 mb-3">{candidate.summary}</p>

      <div className="flex gap-2">
        <button
          onClick={() => onSendMail(candidate)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:border-gray-400 hover:text-gray-900 transition-colors flex-1 justify-center"
        >
          <Mail className="w-3.5 h-3.5" />
          Email
        </button>
        {candidate.profile_url && onLinkedInMessage && (
          <button
            onClick={() => onLinkedInMessage(candidate)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors flex-1 justify-center"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
            Message
          </button>
        )}
        <button
          onClick={() => onShortlist(candidate)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex-1 justify-center ${
            shortlisted
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
              : 'text-gray-600 border border-gray-200 hover:border-gray-900 hover:text-gray-900 hover:bg-gray-50'
          }`}
          disabled={shortlisted}
        >
          {shortlisted
            ? <><BookmarkCheck className="w-3.5 h-3.5" /> Shortlisted</>
            : <><Bookmark className="w-3.5 h-3.5" /> Shortlist</>
          }
        </button>
      </div>
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
  const [limit,         setLimit]         = useState(10)
  const [jobs,          setJobs]          = useState([])
  const [results,       setResults]       = useState(null)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')
  const [mailTarget,      setMailTarget]      = useState(null)
  const [showBulkMail,    setShowBulkMail]    = useState(false)
  const [shortlistTarget, setShortlistTarget] = useState(null)
  const [shortlisted,     setShortlisted]     = useState(new Set())
  const portalRef = useRef(null)

  // Resume browse state
  const [resumeFiles,   setResumeFiles]   = useState([])
  const [resumeJobId,   setResumeJobId]   = useState('')
  const [resumeResults, setResumeResults] = useState(null)
  const [dragOver,      setDragOver]      = useState(false)

  // LinkedIn (Unipile) state
  const [liAccounts,   setLiAccounts]   = useState([])
  const [liSendTarget, setLiSendTarget] = useState(null)
  const [liMsg,        setLiMsg]        = useState('')
  const [liSending,    setLiSending]    = useState(false)
  const [liSendStatus, setLiSendStatus] = useState('')

  const loadLiAccounts = () =>
    linkedinApi.accounts().then(r => setLiAccounts(r.data.accounts || [])).catch(() => {})

  // Naukri session state
  const [showNaukriModal,  setShowNaukriModal]  = useState(false)
  const [naukriCurl,       setNaukriCurl]       = useState('')
  const [naukriSession,    setNaukriSession]    = useState(null)   // {configured, preview}
  const [naukriSaving,     setNaukriSaving]     = useState(false)
  const [naukriMsg,        setNaukriMsg]        = useState('')

  const loadNaukriSession = () =>
    searchApi.getNaukriSession().then(r => setNaukriSession(r.data)).catch(() => {})

  useEffect(() => { jobsApi.list().then(r => setJobs(r.data)).catch(() => {}) }, [])
  useEffect(() => { loadNaukriSession() }, [])
  useEffect(() => { loadLiAccounts() }, [])

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
    const dropped = Array.from(e.dataTransfer.files).filter(f =>
      f.name.endsWith('.pdf') || f.name.endsWith('.txt') ||
      f.name.endsWith('.doc') || f.name.endsWith('.docx')
    )
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
          limit: limit,
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
  const activeJob      = jobs.find(j => j.jobId === activeJobId) || null

  return (
    <div className="px-6 py-5 w-full">

      {mailTarget && (
        <MailModal candidate={mailTarget} job={activeJob} onClose={() => setMailTarget(null)} />
      )}

      {showBulkMail && resumeResults && (
        <BulkMailModal
          candidates={resumeResults.filter(r => r.status === 'success')}
          job={activeJob}
          onClose={() => setShowBulkMail(false)}
        />
      )}

      {shortlistTarget && (
        <ShortlistModal
          candidate={shortlistTarget}
          jobs={jobs}
          preselectedJobId={searchMode === 'job' ? selectedJobId : ''}
          onClose={() => setShortlistTarget(null)}
          onShortlisted={(jobId) => {
            setShortlisted(prev => new Set([...prev, shortlistTarget.name + shortlistTarget.profile_url]))
          }}
        />
      )}

      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Talent Search</h1>
          <p className="text-sm text-gray-400 mt-0.5">Search talent across job portals or screen local resumes</p>
        </div>

        {/* Send Mail button — always visible in Browse Local mode */}
        {isResumeMode && (() => {
          const successCount = resumeResults?.filter(r => r.status === 'success').length ?? 0
          const hasResults   = successCount > 0
          return (
            <button
              onClick={() => hasResults && setShowBulkMail(true)}
              disabled={!hasResults}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                hasResults
                  ? 'text-white cursor-pointer shadow-sm hover:shadow-md'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              style={hasResults ? { background: 'linear-gradient(135deg, #49029F, #7c3aed)' } : {}}
            >
              <Mail className="w-4 h-4" />
              Bulk Send Mail{hasResults ? ` (${successCount})` : ''}
            </button>
          )
        })()}

        {/* Portal picker — hidden in resume mode */}
        {!isResumeMode && (
          <div className="flex items-center gap-2">
            {/* Naukri session indicator */}
            {portals.includes('naukri') && (
              <button
                onClick={() => { setShowNaukriModal(true); setNaukriMsg('') }}
                title="Configure Naukri session"
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-colors ${
                  naukriSession?.configured
                    ? 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100'
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                {naukriSession?.configured ? 'Naukri: Active' : 'Naukri: Setup'}
              </button>
            )}
            <div className="relative" ref={portalRef}>
              <button
                onClick={() => setPortalOpen(v => !v)}
                className="flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-gray-400 transition-colors"
              >
                <div className="flex items-center gap-1">
                  {portals.slice(0, 3).map(v => (
                    <span key={v} className={`w-2 h-2 rounded-full flex-shrink-0 ${PORTALS.find(p => p.value === v)?.dot}`} />
                  ))}
                </div>
                {portals.length === 1 ? PORTALS.find(p => p.value === portals[0])?.label : `${portals.length} portals`}
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${portalOpen ? 'rotate-180' : ''}`} />
              </button>
              {portalOpen && (
                <div className="absolute right-0 mt-1.5 w-44 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-20">
                  {PORTALS.map(p => (
                    <button key={p.value} onClick={() => togglePortal(p.value)}
                      className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm text-left transition-colors ${
                        portals.includes(p.value) ? 'text-gray-900 font-semibold bg-gray-50' : 'text-gray-600 hover:bg-gray-50'
                      }`}>
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${p.dot}`} />
                      <span className="flex-1">{p.label}</span>
                      {portals.includes(p.value) && <span className="text-gray-500 text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Search panel */}
      <form onSubmit={handleSearch} className="bg-white border border-gray-100 rounded-2xl p-5 mb-6 shadow-sm">

        {/* Mode toggle */}
        <div className="flex gap-0.5 p-0.5 bg-gray-100 rounded-xl w-fit mb-4">
          {[
            ['custom', 'Type Requirements'],
            ['job',    'Select Job'],
            ['resume', 'Browse Local'],
          ].map(([mode, label]) => (
            <button key={mode} type="button" onClick={() => { setSearchMode(mode); setError('') }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                searchMode === mode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {mode === 'resume' && <FolderOpen className="w-3.5 h-3.5" />}
              {label}
            </button>
          ))}
        </div>

        {/* ── Portal search modes ── */}
        {searchMode === 'custom' && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
            <textarea value={query} onChange={e => setQuery(e.target.value)} rows={3}
              placeholder="e.g. Senior React developer with Node.js, 5+ years, fintech experience…"
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition" />
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
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Screen against job</label>
              <select value={resumeJobId} onChange={e => setResumeJobId(e.target.value)} className={SELECT}>
                <option value="">— Select a job description —</option>
                {jobs.map(j => <option key={j.jobId} value={j.jobId}>{j.title} ({j.jobId})</option>)}
              </select>
            </div>

            {/* Drop zone */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Resume files</label>
              <label
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-8 cursor-pointer transition-colors ${
                  dragOver ? 'border-purple-400 bg-purple-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Upload className={`w-6 h-6 mb-2 transition-colors ${dragOver ? 'text-purple-500' : 'text-gray-300'}`} />
                <p className="text-sm font-medium text-gray-500">
                  Drop files here or <span className="text-gray-900 underline underline-offset-2">browse</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">PDF, Word (.doc/.docx) or TXT files supported</p>
                <input type="file" multiple accept=".pdf,.doc,.docx,.txt" className="hidden"
                  onChange={e => setResumeFiles(Array.from(e.target.files))} />
              </label>

              {resumeFiles.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {resumeFiles.map(f => (
                    <li key={f.name} className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                      <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="flex-1 truncate">{f.name}</span>
                      <span className="text-gray-400 flex-shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
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
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                placeholder="Location (optional)" className={INPUT + ' flex-1'} />
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input type="number" value={expMin} onChange={e => setExpMin(e.target.value)}
                placeholder="Min" min={0} max={40} className={INPUT + ' w-16 text-center'} />
              <span className="text-gray-300 text-sm">—</span>
              <input type="number" value={expMax} onChange={e => setExpMax(e.target.value)}
                placeholder="Max" min={0} max={40} className={INPUT + ' w-16 text-center'} />
              <span className="text-xs text-gray-400">yrs</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 whitespace-nowrap">Show</span>
              <select
                value={limit}
                onChange={e => setLimit(Number(e.target.value))}
                className="border border-gray-200 rounded-xl px-2 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              >
                {[5, 10, 15, 20, 25, 30, 40, 50].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="text-xs text-gray-400">candidates</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}

        <button type="submit" disabled={loading}
          className="flex items-center gap-2 px-5 py-2 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-all shadow-sm hover:shadow-md"
          style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
          {loading ? (
            <><QlogoLoader size={14} /> {isResumeMode ? 'Screening…' : 'Searching…'}</>
          ) : isResumeMode ? (
            <><Upload className="w-4 h-4" /> Screen {resumeFiles.length || 0} Resume{resumeFiles.length !== 1 ? 's' : ''}</>
          ) : (
            <><Search className="w-4 h-4" /> Search {portals.length === 1 ? PORTALS.find(p => p.value === portals[0])?.label : `${portals.length} Portals`}</>
          )}
        </button>
      </form>

      {/* ── Resume screening results ── */}
      {isResumeMode && resumeResults && (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Screening Results</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {resumeResults.filter(r => r.status === 'success').length} of {resumeResults.length} processed successfully
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            {resumeResults.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-4">
                {r.status === 'success'
                  ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  : <XCircle    className="w-4 h-4 text-red-400 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {r.status === 'success' ? (r.name || r.fileName) : r.fileName}
                  </p>
                  {r.status === 'success' ? (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                      {r.email && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Mail className="w-3 h-3" />{r.email}
                        </span>
                      )}
                      {r.phone && (
                        <span className="text-xs text-gray-400">{r.phone}</span>
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
                {r.status === 'success' && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <BookmarkCheck className="w-3.5 h-3.5" /> Saved
                    </span>
                    <button
                      onClick={() => setMailTarget(r)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:border-gray-400 hover:text-gray-900 transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Mail
                    </button>
                  </div>
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
            <p className="text-sm font-semibold text-gray-900">
              {results.total} candidate{results.total !== 1 ? 's' : ''} found
            </p>
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              {portals.map(v => (
                <span key={v} className={`w-2 h-2 rounded-full ${PORTALS.find(p => p.value === v)?.dot}`} />
              ))}
              via {portals.length === 1 ? PORTALS.find(p => p.value === portals[0])?.label : `${portals.length} portals`}
            </span>
          </div>
          {results.candidates.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Search className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No candidates matched. Try broader requirements.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {results.candidates.map((c, i) => (
                <CandidateCard
                  key={i}
                  candidate={c}
                  onSendMail={setMailTarget}
                  onLinkedInMessage={c.profile_url ? setLiSendTarget : null}
                  onShortlist={setShortlistTarget}
                  shortlisted={shortlisted.has(c.name + c.profile_url)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!results && !resumeResults && !loading && (
        <div className="text-center py-24">
          <Search className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">
            {isResumeMode ? 'Upload resumes to screen candidates' : 'Search for candidates'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {isResumeMode
              ? 'Select a job, add resume files, then click Screen.'
              : 'Choose a portal, enter requirements or a job description, then search.'}
          </p>
        </div>
      )}

      {/* ── LinkedIn Message Modal ── */}
      {liSendTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <p className="text-base font-semibold text-gray-900">Send LinkedIn Message</p>
                <p className="text-xs text-gray-400 mt-0.5">to {liSendTarget.name}</p>
              </div>
              <button onClick={() => { setLiSendTarget(null); setLiMsg(''); setLiSendStatus('') }}
                className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <textarea rows={5}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Hi [Name], I came across your profile and would love to connect about an exciting opportunity…"
                value={liMsg} onChange={e => setLiMsg(e.target.value)} />
              {liSendStatus && (
                <p className={`text-xs ${liSendStatus.includes('sent') ? 'text-emerald-600' : 'text-red-600'}`}>{liSendStatus}</p>
              )}
            </div>
            <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100">
              <button
                disabled={liSending || !liMsg.trim() || liAccounts.length === 0}
                onClick={async () => {
                  setLiSending(true); setLiSendStatus('')
                  try {
                    await linkedinApi.sendMessage(liAccounts[0].id, liSendTarget.profile_url, liMsg.trim())
                    setLiSendStatus('Message sent via LinkedIn!')
                    setLiMsg('')
                  } catch (e) {
                    setLiSendStatus(e?.response?.data?.detail || 'Failed to send. Check LinkedIn connection.')
                  } finally { setLiSending(false) }
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {liSending ? 'Sending…' : 'Send via LinkedIn'}
              </button>
              <button onClick={() => { setLiSendTarget(null); setLiMsg(''); setLiSendStatus('') }}
                className="px-5 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-lg">
                Cancel
              </button>
              {liAccounts.length === 0 && (
                <p className="text-xs text-amber-600">Connect LinkedIn first</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Naukri Session Modal ── */}
      {showNaukriModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <p className="text-base font-semibold text-gray-900">Naukri Resdex Session</p>
                <p className="text-xs text-gray-400 mt-0.5">Paste your Naukri session curl command to enable live candidate search</p>
              </div>
              <button onClick={() => setShowNaukriModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* How-to steps */}
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-xs text-orange-800 space-y-1.5">
                <p className="font-semibold text-orange-900 mb-2">How to get your curl command:</p>
                <p>1. Log in to <strong>resdex.naukri.com</strong> with your recruiter account</p>
                <p>2. Search for candidates (set your filters — skills, location, experience)</p>
                <p>3. Open browser <strong>DevTools → Network tab</strong> (F12)</p>
                <p>4. Find the search request (look for <code>resdex.naukri.com</code> requests)</p>
                <p>5. Right-click → <strong>Copy → Copy as cURL</strong></p>
                <p>6. Paste it below and click Save</p>
              </div>

              {naukriSession?.configured && (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                  <p className="text-xs text-emerald-700">
                    <span className="font-semibold">Active session:</span> {naukriSession.preview}
                  </p>
                  <button
                    onClick={async () => {
                      await searchApi.deleteNaukriSession()
                      setNaukriSession({ configured: false })
                      setNaukriMsg('Session cleared.')
                    }}
                    className="ml-2 text-red-400 hover:text-red-600 flex-shrink-0"
                    title="Remove session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Paste curl command</label>
                <textarea
                  rows={5}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                  placeholder={`curl 'https://resdex.naukri.com/...' \\\n  -H 'Cookie: _t=...; nauk_ses=...' \\\n  -H 'x-http-method-override: GET'`}
                  value={naukriCurl}
                  onChange={e => setNaukriCurl(e.target.value)}
                />
              </div>

              {naukriMsg && (
                <p className={`text-xs ${naukriMsg.includes('Saved') || naukriMsg.includes('cleared') ? 'text-emerald-600' : 'text-red-600'}`}>
                  {naukriMsg}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100">
              <button
                disabled={naukriSaving || !naukriCurl.trim()}
                onClick={async () => {
                  setNaukriSaving(true)
                  setNaukriMsg('')
                  try {
                    await searchApi.saveNaukriSession(naukriCurl.trim())
                    setNaukriMsg('Session saved! Naukri search is now active.')
                    setNaukriCurl('')
                    loadNaukriSession()
                  } catch {
                    setNaukriMsg('Failed to save. Check backend is running.')
                  } finally { setNaukriSaving(false) }
                }}
                className="px-5 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {naukriSaving ? 'Saving…' : 'Save Session'}
              </button>
              <button onClick={() => setShowNaukriModal(false)}
                className="px-5 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-lg transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}


