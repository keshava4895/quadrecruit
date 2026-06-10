import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { jobsApi, candidatesApi, pipelineApi, emailApi } from '../api'
import { useAuth } from '../context/AuthContext'
import { Mail, Calendar, RefreshCw, ChevronLeft, MapPin, Briefcase, X, Send, Loader2, Trash2, Pencil, Check } from 'lucide-react'

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

  const roleDesc = job.description?.trim() ||
    `We are looking for a ${jobTitle} with ${expRange} of experience. ` +
    `The ideal candidate should have expertise in ${skills || 'the relevant technical areas'}` +
    (location ? ` and will be based in ${location}.` : '.')

  const body = `Dear ${candidate.name},

I hope you are doing well.

We came across your profile and were impressed by your experience and skills. We currently have an exciting opportunity for the position of ${jobTitle}, and we believe your background could be a great fit for this role.

About the Role:
${roleDesc}

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
  const { jobId }  = useParams()
  const navigate   = useNavigate()
  const { user }   = useAuth()
  const [job,        setJob]        = useState(null)
  const [candidates, setCandidates] = useState([])
  const [timeline,   setTimeline]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Multi-select
  const [selected,  setSelected]  = useState(new Set())
  const [deleting,  setDeleting]  = useState(false)

  // Positions inline edit
  const [editingPos,   setEditingPos]   = useState(false)
  const [posOpen,      setPosOpen]      = useState(1)
  const [posFilled,    setPosFilled]    = useState(0)
  const [savingPos,    setSavingPos]    = useState(false)

  // Email compose modal
  const [emailModal,   setEmailModal]   = useState(null)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody,    setEmailBody]    = useState('')
  const [sending,      setSending]      = useState(false)
  const [sendResult,   setSendResult]   = useState(null)

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
      candidatesApi.top(jobId, 50),
      pipelineApi.timeline(jobId),
    ])
    if (j.status === 'fulfilled') {
      setJob(j.value.data)
      setPosOpen(j.value.data?.positions_open   ?? 1)
      setPosFilled(j.value.data?.positions_filled ?? 0)
    }
    if (c.status === 'fulfilled') setCandidates(c.value.data)
    if (t.status === 'fulfilled') setTimeline(t.value.data?.timeline ?? [])
    setLoading(false); setRefreshing(false)
    setSelected(new Set())
  }

  useEffect(() => { load() }, [jobId])

  // ── Selection helpers ─────────────────────────────────────────────────────
  const allIds       = candidates.map(c => c.candidateId)
  const allChecked   = allIds.length > 0 && allIds.every(id => selected.has(id))
  const someChecked  = allIds.some(id => selected.has(id))

  const toggleOne = (id) =>
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const toggleAll = () =>
    setSelected(allChecked ? new Set() : new Set(allIds))

  // ── Delete handlers ───────────────────────────────────────────────────────
  const deleteSingle = async (c) => {
    if (!window.confirm(`Remove ${c.name} from this job?`)) return
    try {
      await candidatesApi.remove(c.candidateId, jobId)
      setCandidates(prev => prev.filter(x => x.candidateId !== c.candidateId))
      setSelected(prev => { const n = new Set(prev); n.delete(c.candidateId); return n })
    } catch { /* silent */ }
  }

  const deleteSelected = async () => {
    if (!window.confirm(`Remove ${selected.size} candidate${selected.size !== 1 ? 's' : ''} from this job?`)) return
    setDeleting(true)
    try {
      await Promise.all([...selected].map(id => candidatesApi.remove(id, jobId)))
      setCandidates(prev => prev.filter(c => !selected.has(c.candidateId)))
      setSelected(new Set())
    } catch { /* silent */ }
    finally { setDeleting(false) }
  }

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

  const savePositions = async () => {
    setSavingPos(true)
    try {
      await jobsApi.patch(jobId, { positions_open: posOpen, positions_filled: posFilled })
      setJob(prev => ({ ...prev, positions_open: posOpen, positions_filled: posFilled }))
      setEditingPos(false)
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to save positions.')
    } finally { setSavingPos(false) }
  }

  const stats = [
    { label: 'Candidates',  value: candidates.length },
    { label: 'Interested',  value: candidates.filter(c => c.status === 'interested').length },
    { label: 'Scheduled',   value: candidates.filter(c => c.status === 'scheduled').length },
    { label: 'Hired',       value: candidates.filter(c => c.status === 'selected').length },
    { label: 'Rejected',    value: candidates.filter(c => c.status === 'rejected').length },
  ]

  return (
    <div className="page">

      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 mb-2 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>
          <h1 className="text-xl font-semibold text-zinc-900">{job.title}</h1>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-400">
            <span className="font-mono">{jobId}</span>
            {job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>}
            {job.experience_years && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{job.experience_years}+ yrs</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Edit Positions popover */}
          <div className="relative">
            <button
              onClick={() => { setPosOpen(job.positions_open ?? 1); setPosFilled(job.positions_filled ?? 0); setEditingPos(v => !v) }}
              className={`flex items-center gap-1.5 px-3.5 py-2 border text-sm font-medium rounded-lg transition-colors ${editingPos ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}
            >
              <Pencil className="w-3.5 h-3.5" /> Edit Positions
            </button>
            {editingPos && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-zinc-200 rounded-xl shadow-lg z-20 p-4">
                <p className="text-xs font-semibold text-zinc-700 mb-3">Edit Positions</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Total Positions</label>
                    <input
                      type="number" min="0"
                      value={posOpen}
                      onChange={e => setPosOpen(Math.max(0, +e.target.value))}
                      className="w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Positions Filled</label>
                    <input
                      type="number" min="0" max={posOpen}
                      value={posFilled}
                      onChange={e => setPosFilled(Math.min(posOpen, Math.max(0, +e.target.value)))}
                      className="w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={savePositions}
                    disabled={savingPos}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-zinc-900 hover:bg-zinc-700 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    {savingPos ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    Save
                  </button>
                  <button
                    onClick={() => setEditingPos(false)}
                    className="flex-1 py-1.5 border border-zinc-200 text-zinc-500 hover:bg-zinc-50 text-xs font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => load(true)}
            className="flex items-center gap-2 px-3.5 py-2 border border-zinc-200 text-zinc-600 hover:bg-zinc-50 text-sm font-medium rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-7 gap-3 mb-8">
        {stats.map(({ label, value }) => (
          <div key={label} className="bg-white border border-zinc-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-zinc-900">{value}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{label}</p>
          </div>
        ))}
        {/* Positions Open = total - filled */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-zinc-900">
            {Math.max(0, (job.positions_open ?? 1) - (job.positions_filled ?? 0))}
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">Pos. Open</p>
        </div>
        {/* Positions Filled */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-zinc-900">{job.positions_filled ?? 0}</p>
          <p className="text-xs text-zinc-400 mt-0.5">Pos. Filled</p>
        </div>
      </div>

      {/* Candidate table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden mb-6">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-200 bg-zinc-50/60">
          <span className="text-xs font-semibold text-zinc-700">Top Candidates
            <span className="ml-2 text-zinc-400 font-normal">Ranked by AI match score</span>
          </span>
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <button
                onClick={deleteSelected}
                disabled={deleting}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors"
              >
                {deleting
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting…</>
                  : <><Trash2 className="w-3.5 h-3.5" /> Delete ({selected.size})</>
                }
              </button>
            )}
            <button
              onClick={() => candidates.forEach(c => c.email && openEmail(c))}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-700 text-white text-xs font-medium rounded-lg transition-colors">
              <Mail className="w-3.5 h-3.5" /> Email All
            </button>
          </div>
        </div>

        {candidates.length === 0 ? (
          <div className="text-center py-16 text-zinc-400">
            <p className="text-sm">No candidates yet.</p>
            <p className="text-xs mt-1 text-zinc-300">Shortlist candidates from the Candidates tab or upload resumes in Resume Scorer.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="px-3 py-2 bg-zinc-50 border-b border-zinc-200 w-10">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      ref={el => { if (el) el.indeterminate = someChecked && !allChecked }}
                      onChange={toggleAll}
                      className="w-3 h-3 rounded border-zinc-300 cursor-pointer accent-zinc-900"
                    />
                  </th>
                  {['#', 'Name', 'Skills', 'Exp', 'Email', 'Score', 'Status', 'Phase', ''].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[11px] font-medium text-zinc-500 bg-zinc-50 border-b border-zinc-200 border-l border-zinc-100 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {candidates.map((c, i) => {
                  const isSelected = selected.has(c.candidateId)
                  return (
                    <tr key={c.candidateId}
                      className={`transition-colors ${isSelected ? 'bg-zinc-50' : 'hover:bg-zinc-50/80'}`}>
                      <td className="px-3 py-1.5 border-b border-zinc-100">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(c.candidateId)}
                          className="w-3 h-3 rounded border-zinc-300 cursor-pointer accent-zinc-900"
                        />
                      </td>
                      <td className="px-3 py-1.5 border-b border-zinc-100 border-l border-zinc-100 text-[11px] text-zinc-400">{i + 1}</td>
                      <td className="px-3 py-1.5 border-b border-zinc-100 border-l border-zinc-100 whitespace-nowrap">
                        <Link to={`/candidates/${c.candidateId}`} className="text-xs font-medium text-blue-600 hover:underline transition-colors">
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-3 py-1.5 border-b border-zinc-100 border-l border-zinc-100">
                        <div className="flex flex-wrap gap-1">
                          {c.skills?.slice(0, 3).map(s => (
                            <span key={s} className="px-1.5 py-0.5 bg-zinc-100 text-zinc-600 text-[10px] rounded">{s}</span>
                          ))}
                          {c.skills?.length > 3 && <span className="text-[10px] text-zinc-400">+{c.skills.length - 3}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-1.5 border-b border-zinc-100 border-l border-zinc-100 text-xs text-zinc-500 whitespace-nowrap">{c.experience}y</td>
                      <td className="px-3 py-1.5 border-b border-zinc-100 border-l border-zinc-100 text-xs text-zinc-400 whitespace-nowrap max-w-[160px] truncate">{c.email}</td>
                      <td className="px-3 py-1.5 border-b border-zinc-100 border-l border-zinc-100"><ScoreBadge score={c.match_score} /></td>
                      <td className="px-3 py-1.5 border-b border-zinc-100 border-l border-zinc-100">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLE[c.status] || STATUS_STYLE.sourced}`}>
                          {c.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 border-b border-zinc-100 border-l border-zinc-100 text-xs text-zinc-400 whitespace-nowrap">
                        {c.interview_phase?.replace(/_/g, ' ')}
                      </td>
                      <td className="px-3 py-1.5 border-b border-zinc-100 border-l border-zinc-100">
                        <div className="flex gap-0.5">
                          <button onClick={() => openEmail(c)}
                            className="p-1 rounded text-zinc-300 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Send email">
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                          <button className="p-1 rounded text-zinc-300 hover:text-zinc-700 hover:bg-zinc-100 transition-colors" title="Schedule interview">
                            <Calendar className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteSingle(c)}
                            className="p-1 rounded text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors" title="Remove candidate">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
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

            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Compose Email</h2>
                <p className="text-xs text-zinc-400 mt-0.5">To: <span className="text-zinc-600">{emailModal.name}</span>{emailModal.email ? ` · ${emailModal.email}` : ' · no email on file'}</p>
              </div>
              <button onClick={() => setEmailModal(null)} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-4 h-4" />
              </button>
            </div>

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
