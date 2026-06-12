import { useEffect, useState, useRef } from 'react'
import QlogoLoader from '../components/QlogoLoader'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { candidatesApi, notesApi, offersApi, interviewsApi, authApi, interviewersApi } from '../api'
import { useAuth } from '../context/AuthContext'
import {
  ChevronLeft, Mail, Phone, Briefcase, MapPin, Star,
  FileText, MessageSquare, Calendar, CheckCircle, XCircle,
  Clock, ChevronDown, ChevronUp, Download, Trash2, Pencil,
  Activity, DollarSign, Plus, Video, ExternalLink, UserCheck, Users, X,
} from 'lucide-react'

const STATUS_STYLE = {
  sourced:     'bg-gray-100 text-gray-600',
  emailed:     'bg-blue-50 text-blue-700',
  interested:  'bg-emerald-50 text-emerald-700',
  scheduled:   'bg-amber-50 text-amber-700',
  selected:    'bg-violet-50 text-violet-700',
  rejected:    'bg-red-50 text-red-600',
  no_response: 'bg-gray-100 text-gray-400',
}

const OFFER_STATUS_STYLE = {
  draft:       'bg-gray-100 text-gray-600',
  sent:        'bg-blue-50 text-blue-700',
  negotiating: 'bg-amber-50 text-amber-700',
  accepted:    'bg-emerald-50 text-emerald-700',
  declined:    'bg-red-50 text-red-600',
  withdrawn:   'bg-gray-100 text-gray-500',
}

const DECISION_ICON = {
  Selected:     <CheckCircle className="w-4 h-4 text-emerald-500" />,
  Rejected:     <XCircle className="w-4 h-4 text-red-400" />,
  'Next Round': <ChevronUp className="w-4 h-4 text-blue-500" />,
}

const ACTIVITY_COLORS = {
  note_added:           'bg-indigo-400',
  offer_created:        'bg-emerald-400',
  offer_updated:        'bg-amber-400',
  status_changed:       'bg-purple-400',
  interview_scheduled:  'bg-blue-400',
  interview_updated:    'bg-sky-400',
}

const IV_STATUS_STYLE = {
  scheduled:   'bg-blue-50 text-blue-700',
  completed:   'bg-emerald-50 text-emerald-700',
  cancelled:   'bg-red-50 text-red-500',
  no_show:     'bg-orange-50 text-orange-700',
  rescheduled: 'bg-amber-50 text-amber-700',
}

const IV_TYPE_ICON = { video: Video, phone: Phone, in_person: MapPin }

function ScoreRing({ score }) {
  const pct   = Math.round((score || 0) * 100)
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444'
  const r = 28, circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <div className="relative w-20 h-20 flex-shrink-0">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#f3f4f6" strokeWidth="6" />
        <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-gray-900">{pct}%</span>
        <span className="text-[9px] text-gray-400 leading-none">match</span>
      </div>
    </div>
  )
}

function Section({ title, icon, children, defaultOpen = true, action }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between">
        <button onClick={() => setOpen(v => !v)}
          className="flex-1 flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            {icon}
            {title}
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {action && <div className="pr-4">{action}</div>}
      </div>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  )
}

function fmtDate(val, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!val) return ''
  try { return new Date(val).toLocaleDateString('en-IN', opts) }
  catch { return '' }
}

export default function CandidateProfile() {
  const { candidateId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [profile,    setProfile]    = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [dlLoading,  setDlLoading]  = useState(false)

  const [notes,      setNotes]      = useState([])
  const [noteText,   setNoteText]   = useState('')
  const [addingNote, setAddingNote] = useState(false)

  const [activity,   setActivity]   = useState([])

  const [offers,      setOffers]      = useState([])
  const [interviews2, setInterviews2] = useState([])

  // ── Ownership & assignments ────────────────────────────────────────────────
  const [members,           setMembers]           = useState([])
  const [interviewers,      setInterviewers]      = useState([])
  const [ownerSaving,       setOwnerSaving]       = useState(false)
  const [roundAssignSaving, setRoundAssignSaving] = useState({}) // keyed by `${jobId}-${roundType}`
  const ownerRef = useRef(null)

  // ── Edit profile ───────────────────────────────────────────────────────────
  const [editOpen,   setEditOpen]   = useState(false)
  const [editForm,   setEditForm]   = useState({})
  const [editSaving, setEditSaving] = useState(false)
  const [editError,  setEditError]  = useState('')

  useEffect(() => {
    authApi.users().then(r => setMembers(r.data || [])).catch(() => {})
    interviewersApi.list().then(r => setInterviewers(r.data || [])).catch(() => {})
  }, [])

  function openEdit() {
    setEditForm({
      name:            profile.name            || '',
      email:           profile.email?.includes('@placeholder') ? '' : (profile.email || ''),
      alternate_email: profile.alternate_email  || '',
      phone:           profile.phone            || '',
      alternate_phone: profile.alternate_phone  || '',
      location:        profile.location         || '',
      current_company: profile.current_company  || '',
      current_role:    profile.current_role     || '',
      linkedin_url:    profile.linkedin_url      || '',
      notice_period:   profile.notice_period     || '',
      expected_salary: profile.expected_salary   || '',
      experience:      profile.experience        ?? 0,
      skills:          Array.isArray(profile.skills) ? profile.skills.join(', ') : (profile.skills || ''),
      summary:         profile.summary           || '',
    })
    setEditError('')
    setEditOpen(true)
  }

  async function saveEdit() {
    if (!editForm.name?.trim()) return
    setEditSaving(true); setEditError('')
    try {
      const payload = {
        ...editForm,
        skills: editForm.skills.split(',').map(s => s.trim()).filter(Boolean),
        experience: Number(editForm.experience) || 0,
      }
      const r = await candidatesApi.updateProfile(candidateId, payload)
      setProfile(prev => ({ ...prev, ...r.data }))
      setEditOpen(false)
    } catch (err) {
      setEditError(err?.response?.data?.detail || 'Failed to save changes')
    } finally { setEditSaving(false) }
  }

  async function handleAssignOwner(memberId) {
    setOwnerSaving(true)
    try {
      const r = await candidatesApi.assignOwner(candidateId, memberId || null)
      setProfile(prev => ({ ...prev, owner_id: r.data.owner_id, owner_name: r.data.owner_name }))
    } catch { }
    setOwnerSaving(false)
  }

  async function handleUpdateRoundAssignment(jobId, roundType, interviewerId) {
    const key = `${jobId}-${roundType}`
    setRoundAssignSaving(prev => ({ ...prev, [key]: true }))
    try {
      const r = await candidatesApi.updateRoundAssignment(candidateId, jobId, roundType, interviewerId || null)
      setProfile(prev => ({
        ...prev,
        jobs: prev.jobs.map(j =>
          j.jobId === jobId
            ? {
                ...j,
                round_assignments: {
                  ...j.round_assignments,
                  [roundType]: interviewerId
                    ? { interviewer_id: r.data.interviewer_id, interviewer_name: r.data.interviewer_name }
                    : undefined,
                },
              }
            : j
        ),
      }))
    } catch { }
    setRoundAssignSaving(prev => ({ ...prev, [key]: false }))
  }

  useEffect(() => {
    candidatesApi.fullProfile(candidateId)
      .then(r => setProfile(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))

    notesApi.list(candidateId).then(r => setNotes(r.data || [])).catch(() => {})
    notesApi.activity(candidateId).then(r => setActivity(r.data || [])).catch(() => {})
    offersApi.list({ candidate_id: candidateId }).then(r => setOffers(r.data || [])).catch(() => {})
    interviewsApi.list({ candidate_id: candidateId }).then(r => setInterviews2(r.data || [])).catch(() => {})
  }, [candidateId])

  async function downloadResume() {
    setDlLoading(true)
    try {
      const r = await candidatesApi.resumeUrl(candidateId)
      window.open(r.data.url, '_blank')
    } catch { alert('Resume file not available.') }
    finally { setDlLoading(false) }
  }

  async function handleAddNote(e) {
    e.preventDefault()
    if (!noteText.trim()) return
    setAddingNote(true)
    try {
      const r = await notesApi.add(candidateId, noteText.trim())
      setNotes(prev => [r.data, ...prev])
      setNoteText('')
      notesApi.activity(candidateId).then(r => setActivity(r.data || [])).catch(() => {})
    } catch { }
    finally { setAddingNote(false) }
  }

  async function handleDeleteNote(noteId) {
    try {
      await notesApi.delete(candidateId, noteId)
      setNotes(prev => prev.filter(n => n.noteId !== noteId))
    } catch { }
  }

  if (loading) return (
    <div className="px-6 py-5 w-full flex items-center justify-center h-64 gap-2 text-gray-400">
      <QlogoLoader size={40} label="Loading profile…" />
    </div>
  )
  if (!profile) return (
    <div className="px-6 py-5 w-full text-sm text-red-500">Candidate not found.</div>
  )

  const bestScore = Math.max(...(profile.jobs || []).map(j => j.match_score || 0), 0)
  const bestJob   = profile.jobs?.find(j => j.match_score === bestScore)

  return (
    <div className="px-6 py-5 w-full max-w-4xl">

      {/* Back */}
      <button onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 mb-4 transition-colors rounded-lg hover:bg-gray-50 px-2 py-1 -ml-2">
        <ChevronLeft className="w-3.5 h-3.5" /> Back
      </button>

      {/* Header card */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-4 flex items-start gap-5 shadow-sm">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
          {profile.name?.charAt(0)?.toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">{profile.name}</h1>
                <button onClick={openEdit}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-colors">
                  <Pencil className="w-3 h-3" /> Edit
                </button>
                {profile.resume_blob && (
                  <button onClick={downloadResume} disabled={dlLoading}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-white rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
                    {dlLoading ? <QlogoLoader size={14} /> : <Download className="w-3.5 h-3.5" />}
                    Download Resume
                  </button>
                )}
                <Link to="/offers"
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-100 rounded-xl hover:bg-purple-100 transition-colors">
                  <Plus className="w-3 h-3" />Create Offer
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-gray-400">
                {profile.email && !profile.email.includes('@placeholder') && (
                  <a href={`mailto:${profile.email}`} className="flex items-center gap-1 hover:text-gray-700 transition-colors">
                    <Mail className="w-3.5 h-3.5" />{profile.email}
                  </a>
                )}
                {profile.alternate_email && (
                  <a href={`mailto:${profile.alternate_email}`} className="flex items-center gap-1 hover:text-gray-700 transition-colors">
                    <Mail className="w-3.5 h-3.5 text-gray-300" />{profile.alternate_email}
                  </a>
                )}
                {profile.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />{profile.phone}
                  </span>
                )}
                {profile.alternate_phone && (
                  <span className="flex items-center gap-1 text-gray-300">
                    <Phone className="w-3.5 h-3.5" />{profile.alternate_phone}
                  </span>
                )}
                {profile.experience > 0 && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5" />{profile.experience} yrs experience
                  </span>
                )}
                {profile.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />{profile.location}
                  </span>
                )}
                {profile.current_company && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-gray-300" />
                    {profile.current_role ? `${profile.current_role} @ ${profile.current_company}` : profile.current_company}
                  </span>
                )}
              </div>
            </div>
            {bestJob && (
              <div className="flex items-center gap-3">
                <ScoreRing score={bestScore} />
                <div>
                  <p className="text-xs text-gray-400">Best match</p>
                  <p className="text-sm font-medium text-gray-700 max-w-[140px] truncate">{bestJob.title}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[bestJob.status] || STATUS_STYLE.sourced}`}>
                    {bestJob.status?.replace('_', ' ')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Skills */}
          {profile.skills?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {profile.skills.map(s => (
                <span key={s} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs">{s}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">

        {/* ── Assigned To ──────────────────────────────────────────────────── */}
        <div className="bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-semibold text-gray-800">Assigned To</span>
          </div>

          <div className="flex items-center gap-2">
            {profile.owner_name ? (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
                  {profile.owner_name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-700">{profile.owner_name}</span>
              </div>
            ) : (
              <span className="text-sm text-gray-400 italic">Unassigned</span>
            )}

            <select
              ref={ownerRef}
              value={profile.owner_id || ''}
              onChange={e => handleAssignOwner(e.target.value)}
              disabled={ownerSaving}
              className="ml-2 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer disabled:opacity-50">
              <option value="">— Unassigned —</option>
              {members.filter(m => m.is_active).map(m => (
                <option key={m.userId} value={m.userId}>{m.name} ({m.role})</option>
              ))}
            </select>

            {ownerSaving && <QlogoLoader size={14} />}
          </div>
        </div>

        {/* Summary */}
        {profile.summary && (
          <Section title="Summary" icon={<Star className="w-4 h-4 text-amber-400" />}>
            <p className="text-sm text-gray-600 leading-relaxed">{profile.summary}</p>
          </Section>
        )}

        {/* Notes */}
        <Section title={`Notes (${notes.length})`} icon={<MessageSquare className="w-4 h-4 text-indigo-500" />}>
          <form onSubmit={handleAddNote} className="mb-4">
            <textarea
              value={noteText} onChange={e => setNoteText(e.target.value)}
              rows={2} placeholder="Add a note about this candidate…"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-50 resize-none"
            />
            <div className="flex justify-end mt-2">
              <button type="submit" disabled={addingNote || !noteText.trim()}
                className="px-4 py-1.5 text-xs font-medium text-white rounded-xl disabled:opacity-40 transition-all"
                style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
                {addingNote ? 'Adding…' : 'Add Note'}
              </button>
            </div>
          </form>
          {notes.length === 0 ? (
            <p className="text-sm text-gray-400">No notes yet.</p>
          ) : (
            <div className="space-y-2">
              {notes.map(note => (
                <div key={note.noteId} className="bg-gray-50 rounded-xl p-3 group">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-gray-700 leading-relaxed flex-1">{note.text}</p>
                    <button onClick={() => handleDeleteNote(note.noteId)}
                      className="w-5 h-5 flex items-center justify-center rounded text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    {note.userName} · {fmtDate(note.created_at, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Offers */}
        <Section
          title={`Offers (${offers.length})`}
          icon={<DollarSign className="w-4 h-4 text-emerald-500" />}
          action={
            <Link to="/offers"
              className="flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-700 transition-colors">
              <Plus className="w-3 h-3" /> New
            </Link>
          }>
          {offers.length === 0 ? (
            <p className="text-sm text-gray-400">No offers yet. <Link to="/offers" className="text-purple-600 hover:underline">Create one →</Link></p>
          ) : (
            <div className="space-y-2">
              {offers.map(offer => (
                <div key={offer.offerId} className="flex items-center gap-4 py-2.5 border-b border-gray-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{offer.jobTitle}</p>
                    <p className="text-xs text-gray-400">
                      {offer.ctc != null ? `₹${offer.ctc} LPA` : 'CTC not set'}
                      {offer.joining_date ? ` · Joining ${fmtDate(offer.joining_date)}` : ''}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${OFFER_STATUS_STYLE[offer.status] || 'bg-gray-100 text-gray-600'}`}>
                    {offer.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Activity */}
        {activity.length > 0 && (
          <Section title="Activity" icon={<Activity className="w-4 h-4 text-blue-500" />} defaultOpen={false}>
            <div className="space-y-3">
              {activity.map((a, i) => (
                <div key={a.activityId || i} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${ACTIVITY_COLORS[a.type] || 'bg-gray-300'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">{a.text}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{fmtDate(a.ts, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Job Applications */}
        {profile.jobs?.length > 0 && (
          <Section title="Job Applications" icon={<Briefcase className="w-4 h-4 text-blue-500" />}>
            <div className="space-y-2">
              {profile.jobs.map(j => {
                const pct = Math.round((j.match_score || 0) * 100)
                const bar = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-400' : 'bg-red-400'
                return (
                  <div key={j.jobId} className="py-2.5 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Link to={`/jobs/${j.jobId}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors truncate">
                            {j.title}
                          </Link>
                          {j.location && <span className="flex items-center gap-0.5 text-xs text-gray-400 flex-shrink-0"><MapPin className="w-3 h-3" />{j.location}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[120px]">
                            <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-gray-700">{pct}%</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_STYLE[j.status] || STATUS_STYLE.sourced}`}>
                        {j.status?.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Per-round interviewer assignment */}
                    {[
                      { type: 'technical',       label: 'Technical',       count: j.rounds_technical },
                      { type: 'tech_managerial', label: 'Tech Managerial', count: j.rounds_tech_managerial },
                      { type: 'managerial',      label: 'Managerial',      count: j.rounds_managerial },
                      { type: 'hr',              label: 'HR Round',        count: j.rounds_hr },
                    ].filter(r => r.count > 0).map(r => {
                      const assign = j.round_assignments?.[r.type]
                      const key = `${j.jobId}-${r.type}`
                      return (
                        <div key={r.type} className="flex items-center gap-2 mt-1 pl-0.5">
                          <Users className="w-3 h-3 text-gray-300 flex-shrink-0" />
                          <span className="text-[11px] text-gray-400 w-28 flex-shrink-0">
                            {r.label} ×{r.count}
                          </span>
                          {assign?.interviewer_name ? (
                            <div className="flex items-center gap-1">
                              <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0">
                                {assign.interviewer_name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-[11px] font-medium text-gray-700">{assign.interviewer_name}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-gray-300 italic">Unassigned</span>
                          )}
                          <select
                            value={assign?.interviewer_id || ''}
                            onChange={e => handleUpdateRoundAssignment(j.jobId, r.type, e.target.value)}
                            disabled={roundAssignSaving[key]}
                            className="ml-1 text-[11px] border border-gray-200 rounded-lg px-1.5 py-1 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer disabled:opacity-50">
                            <option value="">— Unassign —</option>
                            {interviewers.map(iv => (
                              <option key={iv.interviewerId} value={iv.interviewerId}>{iv.name}</option>
                            ))}
                          </select>
                          {roundAssignSaving[key] && <QlogoLoader size={12} />}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </Section>
        )}

        {/* Interview Feedback */}
        {profile.feedback?.length > 0 && (
          <Section title="Interview Feedback" icon={<MessageSquare className="w-4 h-4 text-violet-500" />}>
            <div className="space-y-3">
              {profile.feedback.map((fb, i) => (
                <div key={i} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {DECISION_ICON[fb.decision]}
                      <span className="text-sm font-medium text-gray-900">Round {fb.round}</span>
                      {fb.interviewer_name && (
                        <span className="text-xs text-gray-400">by {fb.interviewer_name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Rating</span>
                      <span className="text-sm font-bold text-gray-900">{fb.rating}/10</span>
                    </div>
                  </div>
                  {fb.comments && (
                    <p className="text-sm text-gray-600 leading-relaxed">{fb.comments}</p>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Scheduled Interviews */}
        <Section
          title={`Interviews (${interviews2.length})`}
          icon={<Calendar className="w-4 h-4 text-blue-500" />}
          action={
            <Link to="/interviews"
              className="flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-700 transition-colors">
              <Plus className="w-3 h-3" /> Schedule
            </Link>
          }>
          {interviews2.length === 0 ? (
            <p className="text-sm text-gray-400">
              No interviews scheduled.{' '}
              <Link to="/interviews" className="text-purple-600 hover:underline">Schedule one →</Link>
            </p>
          ) : (
            <div className="space-y-2">
              {[...interviews2].sort((a, b) => (a.scheduled_at || '') < (b.scheduled_at || '') ? -1 : 1).map(iv => {
                const TypeIcon = IV_TYPE_ICON[iv.type] || Video
                return (
                  <div key={iv.interviewId} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900 truncate">{iv.jobTitle}</p>
                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-md text-[11px]">
                          <TypeIcon className="w-3 h-3" /> Round {iv.round}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        with {iv.interviewerName}
                        {iv.scheduled_at && ` · ${fmtDate(iv.scheduled_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
                        {iv.duration_mins && ` · ${iv.duration_mins} min`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {iv.meeting_link && (
                        <a href={iv.meeting_link} target="_blank" rel="noopener noreferrer"
                          className="p-1 rounded text-blue-400 hover:text-blue-600 transition-colors" title="Join">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${IV_STATUS_STYLE[iv.status] || 'bg-gray-100 text-gray-600'}`}>
                        {iv.status?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Section>

        {/* Resume */}
        {profile.resume_text && (
          <Section title="Resume Text" icon={<FileText className="w-4 h-4 text-gray-500" />} defaultOpen={false}>
            <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono leading-relaxed bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto border border-gray-100">
              {profile.resume_text}
            </pre>
          </Section>
        )}

      </div>

      {/* ── Edit Candidate Modal ────────────────────────────────────────────── */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h2 className="text-sm font-semibold text-gray-900">Edit Candidate Profile</h2>
              <div className="flex items-center gap-2">
                {editError && <span className="text-xs text-red-500">{editError}</span>}
                <button onClick={() => setEditOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* Contact */}
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'name',            label: 'Full Name',      required: true },
                  { key: 'email',           label: 'Email' },
                  { key: 'alternate_email', label: 'Alternate Email' },
                  { key: 'phone',           label: 'Phone' },
                  { key: 'alternate_phone', label: 'Alternate Phone' },
                  { key: 'linkedin_url',    label: 'LinkedIn URL' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      {f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    <input
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                      value={editForm[f.key] || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>

              {/* Professional */}
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-2">Professional</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'current_company', label: 'Current Company' },
                  { key: 'current_role',    label: 'Current Role / Title' },
                  { key: 'location',        label: 'Location' },
                  { key: 'notice_period',   label: 'Notice Period' },
                  { key: 'expected_salary', label: 'Expected Salary' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{f.label}</label>
                    <input
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                      value={editForm[f.key] || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Experience (years)</label>
                  <input type="number" min="0"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                    value={editForm.experience ?? 0}
                    onChange={e => setEditForm(prev => ({ ...prev, experience: +e.target.value }))}
                  />
                </div>
              </div>

              {/* Skills */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Skills <span className="font-normal text-gray-400">(comma-separated)</span>
                </label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  value={editForm.skills || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, skills: e.target.value }))}
                />
              </div>

              {/* Summary */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Summary</label>
                <textarea rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition resize-none"
                  value={editForm.summary || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, summary: e.target.value }))}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex-shrink-0">
              <button onClick={() => setEditOpen(false)}
                className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-xl transition-colors">
                Cancel
              </button>
              <button onClick={saveEdit} disabled={editSaving || !editForm.name?.trim()}
                className="px-5 py-2 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-all shadow-sm hover:shadow-md"
                style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
