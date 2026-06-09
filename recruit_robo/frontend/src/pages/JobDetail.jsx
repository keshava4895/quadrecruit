import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { jobsApi, candidatesApi, pipelineApi, emailApi } from '../api'
import { useAuth } from '../context/AuthContext'
import { Mail, Calendar, RefreshCw, ChevronLeft, MapPin, Briefcase, X, Send, Loader2 } from 'lucide-react'

const STATUS_STYLE = {
  sourced:     'bg-zinc-100 text-zinc-600',
  emailed:     'bg-blue-50 text-blue-700',
  interested:  'bg-emerald-50 text-emerald-700',
  scheduled:   'bg-amber-50 text-amber-700',
  selected:    'bg-violet-50 text-violet-700',
  rejected:    'bg-red-50 text-red-600',
  no_response: 'bg-zinc-100 text-zinc-400',
}

function ScoreBadge({ score }) {
  const pct = Math.round((score || 0) * 100)
  const color = pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-500'
  return <span className={`text-sm font-semibold ${color}`}>{pct}%</span>
}

function buildEmailTemplate(candidate, job, user) {
  const skills   = (job.skills || []).join(', ') || '[Key Skills]'
  const location = job.location || '[Location]'
  const expRange = job.experience_years ? `${job.experience_years}+ Years` : '[X–Y Years]'
  const jobTitle = job.title || '[Job Title]'
  const userName = user?.name || '[Your Name]'
  const userEmail = user?.email || '[Email Address]'

  const subject = `Exciting Job Opportunity – ${jobTitle}`

  const body = `Dear ${candidate.name},

I hope you are doing well.

We came across your profile and were impressed by your experience and skills. We currently have an exciting opportunity for the position of ${jobTitle}, and we believe your background could be a great fit for this role.

Job Details:

Position: ${jobTitle}
Location: ${location}
Experience Required: ${expRange}
Employment Type: Full-Time
Skills Required: ${skills}

If you are interested in exploring this opportunity, please reply to this email with your updated resume and contact details. We would be happy to discuss the role and answer any questions you may have.

Looking forward to hearing from you.

Best Regards,
${userName}
Recruiter
${userEmail}`

  return { subject, body }
}

export default function JobDetail() {
  const { jobId } = useParams()
  const { user }  = useAuth()
  const [job,        setJob]        = useState(null)
  const [candidates, setCandidates] = useState([])
  const [timeline,   setTimeline]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Email compose modal
  const [emailModal,   setEmailModal]   = useState(null)  // { candidate } | null
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody,    setEmailBody]    = useState('')
  const [sending,      setSending]      = useState(false)
  const [sendResult,   setSendResult]   = useState(null)  // { ok, msg }

  function openEmail(candidate) {
    const { subject, body } = buildEmailTemplate(candidate, job || {}, user)
    setEmailSubject(subject)
    setEmailBody(body)
    setSendResult(null)
    setEmailModal(candidate)
  }

  async function handleSend() {
    if (!emailModal?.email) return
    setSending(true); setSendResult(null)
    try {
      await emailApi.send(emailModal.email, emailSubject, emailBody)
      setSendResult({ ok: true, msg: `Email sent to ${emailModal.email}` })
      // update candidate status to emailed
      await candidatesApi.updateStatus(emailModal.candidateId, 'emailed', jobId)
      setCandidates(prev => prev.map(c =>
        c.candidateId === emailModal.candidateId ? { ...c, status: 'emailed' } : c
      ))
      setTimeout(() => setEmailModal(null), 1500)
    } catch (e) {
      setSendResult({ ok: false, msg: e?.response?.data?.detail || 'Failed to send email.' })
    } finally {
      setSending(false)
    }
  }

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true)
    const [j, c, t] = await Promise.allSettled([
      jobsApi.get(jobId),
      candidatesApi.top(jobId, 10),
      pipelineApi.timeline(jobId),
    ])
    if (j.status === 'fulfilled') setJob(j.value.data)
    if (c.status === 'fulfilled') setCandidates(c.value.data)
    if (t.status === 'fulfilled') setTimeline(t.value.data?.timeline ?? [])
    setLoading(false); setRefreshing(false)
  }

  useEffect(() => { load() }, [jobId])

  if (loading) return (
    <div className="page">
      <div className="h-64 flex items-center justify-center text-zinc-400 text-sm">Loading…</div>
    </div>
  )
  if (!job) return (
    <div className="page">
      <div className="text-red-500 text-sm">Job not found.</div>
    </div>
  )

  const stats = [
    { label: 'Candidates',  value: candidates.length },
    { label: 'Interested',  value: candidates.filter(c => c.status === 'interested').length },
    { label: 'Scheduled',   value: candidates.filter(c => c.status === 'scheduled').length },
    { label: 'Selected',    value: candidates.filter(c => c.status === 'selected').length },
  ]

  return (
    <div className="page">

      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <Link to="/jobs" className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 mb-2 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" /> All Jobs
          </Link>
          <h1 className="text-xl font-semibold text-zinc-900">{job.title}</h1>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-400">
            <span className="font-mono">{jobId}</span>
            {job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>}
            {job.experience_years && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{job.experience_years}+ yrs</span>}
          </div>
        </div>
        <button
          onClick={() => load(true)}
          className="flex items-center gap-2 px-3.5 py-2 border border-zinc-200 text-zinc-600 hover:bg-zinc-50 text-sm font-medium rounded-lg transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {stats.map(({ label, value }) => (
          <div key={label} className="bg-white border border-zinc-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-zinc-900">{value}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Candidate table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden mb-6">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Top Candidates</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Ranked by AI match score</p>
          </div>
          <button
            onClick={() => candidates.forEach(c => c.email && openEmail(c))}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-700 text-white text-xs font-medium rounded-lg transition-colors">
            <Mail className="w-3.5 h-3.5" /> Email All
          </button>
        </div>

        {candidates.length === 0 ? (
          <div className="text-center py-16 text-zinc-400">
            <p className="text-sm">No candidates yet.</p>
            <p className="text-xs mt-1 text-zinc-300">Upload resumes from the Resume Scorer page to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  {['#', 'Name', 'Skills', 'Exp', 'Email', 'Score', 'Status', 'Phase', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {candidates.map((c, i) => (
                  <tr key={c.candidateId} className="border-b border-zinc-50 hover:bg-zinc-50/60 transition-colors last:border-0">
                    <td className="px-4 py-3 text-xs font-medium text-zinc-400">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-zinc-900 whitespace-nowrap">{c.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.skills?.slice(0, 3).map(s => (
                          <span key={s} className="px-1.5 py-0.5 bg-zinc-100 text-zinc-600 text-xs rounded">{s}</span>
                        ))}
                        {c.skills?.length > 3 && <span className="text-xs text-zinc-400">+{c.skills.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">{c.experience}y</td>
                    <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">{c.email}</td>
                    <td className="px-4 py-3"><ScoreBadge score={c.match_score} /></td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[c.status] || STATUS_STYLE.sourced}`}>
                        {c.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">
                      {c.interview_phase?.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEmail(c)}
                          className="p-1.5 rounded-lg text-zinc-300 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Send email">
                          <Mail className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1.5 rounded-lg text-zinc-300 hover:text-zinc-700 hover:bg-zinc-100 transition-colors" title="Schedule interview">
                          <Calendar className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pipeline timeline */}
      <div className="bg-white border border-zinc-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-zinc-900 mb-4">Pipeline Timeline</h2>
        {timeline.length === 0 ? (
          <p className="text-sm text-zinc-400">No pipeline events yet.</p>
        ) : (
          <ol className="relative border-l border-zinc-100 pl-6 space-y-4">
            {timeline.map((e, i) => (
              <li key={i} className="relative">
                <div className="absolute -left-[25px] w-2.5 h-2.5 rounded-full bg-zinc-300 border-2 border-white mt-1" />
                <p className="text-sm font-medium text-zinc-800">{e.stage}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{new Date(e.ts).toLocaleString()}</p>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Email compose modal */}
      {emailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Compose Email</h2>
                <p className="text-xs text-zinc-400 mt-0.5">To: <span className="text-zinc-600">{emailModal.name}</span>{emailModal.email ? ` · ${emailModal.email}` : ' · no email on file'}</p>
              </div>
              <button onClick={() => setEmailModal(null)} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-500 block mb-1">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 block mb-1">Message</label>
                <textarea
                  rows={16}
                  value={emailBody}
                  onChange={e => setEmailBody(e.target.value)}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none"
                />
              </div>

              {sendResult && (
                <p className={`text-xs font-medium ${sendResult.ok ? 'text-emerald-600' : 'text-red-500'}`}>
                  {sendResult.msg}
                </p>
              )}

              {!emailModal.email && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                  This candidate has no email address on file. Email cannot be sent.
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-zinc-100">
              <button
                onClick={() => setEmailModal(null)}
                className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 border border-zinc-200 rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !emailModal.email || sendResult?.ok}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors">
                {sending
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</>
                  : <><Send className="w-3.5 h-3.5" /> Send Email</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
