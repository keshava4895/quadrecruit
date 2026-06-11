import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { interviewsApi, candidatesApi, jobsApi, interviewersApi, availabilityApi, outreachApi, msGraphApi } from '../api'
import QlogoLoader from '../components/QlogoLoader'
import DateTimePicker from '../components/DateTimePicker'
import {
  Calendar, Clock, Video, Phone, MapPin, Plus, X,
  CheckCircle, XCircle, Edit2, Trash2, ExternalLink,
  Star, AlertCircle, RefreshCw, User, ChevronDown, Mail, Send,
} from 'lucide-react'

// ── constants ─────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  scheduled:   { label: 'Scheduled',   color: 'bg-blue-50 text-blue-700',       dot: 'bg-blue-400' },
  completed:   { label: 'Completed',   color: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-400' },
  cancelled:   { label: 'Cancelled',   color: 'bg-red-50 text-red-500',         dot: 'bg-red-400' },
  no_show:     { label: 'No Show',     color: 'bg-orange-50 text-orange-700',   dot: 'bg-orange-400' },
  rescheduled: { label: 'Rescheduled', color: 'bg-amber-50 text-amber-700',     dot: 'bg-amber-400' },
}

const TYPE_CFG = {
  video:     { label: 'Video',     Icon: Video,  color: 'bg-sky-50 text-sky-700' },
  phone:     { label: 'Phone',     Icon: Phone,  color: 'bg-gray-100 text-gray-600' },
  in_person: { label: 'In-Person', Icon: MapPin, color: 'bg-violet-50 text-violet-700' },
}

const DURATIONS = [30, 45, 60, 90]

const BLANK_FORM = {
  jobId: '', interviewerId: '', round: 1,
  type: 'video', datetime: '', duration_mins: 60,
  meeting_link: '', location: '', notes: '',
}

// ── helpers ───────────────────────────────────────────────────────────────────
function fmtTime(iso) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) }
  catch { return '' }
}

function fmtDateLabel(dateStr) {
  if (!dateStr || dateStr === 'unknown') return 'Unscheduled'
  try {
    const today    = new Date().toISOString().slice(0, 10)
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    const d        = new Date(dateStr + 'T00:00:00')
    const label    = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
    if (dateStr === today)    return `Today — ${label}`
    if (dateStr === tomorrow) return `Tomorrow — ${label}`
    return label
  } catch { return dateStr }
}

// ── sub-components ────────────────────────────────────────────────────────────
function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className={`transition-colors ${n <= (value || 0) ? 'text-amber-400' : 'text-gray-200'} hover:text-amber-300`}>
          <Star className="w-5 h-5 fill-current" />
        </button>
      ))}
    </div>
  )
}

function InterviewCard({ iv, today, onEdit, onDelete }) {
  const sc  = STATUS_CFG[iv.status] || STATUS_CFG.scheduled
  const tc  = TYPE_CFG[iv.type]     || TYPE_CFG.video
  const TypeIcon = tc.Icon
  const dateStr  = iv.scheduled_at?.slice(0, 10)
  const isToday  = dateStr === today
  const isPast   = dateStr && dateStr < today
  const d        = iv.scheduled_at ? new Date(iv.scheduled_at) : null

  return (
    <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3.5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Date block */}
      <div className={`w-14 flex-shrink-0 flex flex-col items-center justify-center rounded-xl py-2.5 px-1 ${
        isToday ? '' : isPast ? 'bg-gray-50' : 'bg-blue-50'
      }`}
        style={isToday ? { background: 'linear-gradient(135deg, #49029F, #7c3aed)' } : {}}>
        {d ? (
          <>
            <span className={`text-xl font-bold leading-none ${isToday ? 'text-white' : 'text-gray-900'}`}>
              {d.getDate()}
            </span>
            <span className={`text-[11px] mt-0.5 ${isToday ? 'text-purple-200' : 'text-gray-400'}`}>
              {d.toLocaleDateString('en-IN', { month: 'short' })}
            </span>
            <span className={`text-[10px] ${isToday ? 'text-purple-300' : 'text-gray-400'}`}>
              {d.toLocaleDateString('en-IN', { weekday: 'short' })}
            </span>
          </>
        ) : <Calendar className="w-5 h-5 text-gray-400" />}
      </div>

      {/* Candidate + job info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/candidates/${iv.candidateId}`}
            className="text-sm font-semibold text-gray-900 hover:text-purple-700 transition-colors">
            {iv.candidateName}
          </Link>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${tc.color}`}>
            <TypeIcon className="w-3 h-3" />{tc.label}
          </span>
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[11px] font-medium">
            Round {iv.round}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{iv.jobTitle}</p>
        <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400 flex-wrap">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />{iv.interviewerName}
          </span>
          {iv.scheduled_at && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />{fmtTime(iv.scheduled_at)}
            </span>
          )}
          {iv.duration_mins && <span>{iv.duration_mins} min</span>}
        </div>
      </div>

      {/* Status + actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${sc.color}`}>
          {sc.label}
        </span>
        {iv.meeting_link && (
          <a href={iv.meeting_link} target="_blank" rel="noopener noreferrer"
            title="Join Meeting"
            className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        <button onClick={() => onEdit(iv)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors">
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onDelete(iv)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Outreach / Interest Email Modal ──────────────────────────────────────────
function OutreachModal({ allCandidates, jobs, interviewers, onClose, onSent }) {
  const [candSearch,    setCandSearch]    = useState('')
  const [selectedCand,  setSelectedCand]  = useState(null)
  const [jobId,         setJobId]         = useState('')
  const [interviewerId, setInterviewerId] = useState('')
  const [note,          setNote]          = useState('')
  const [slots,         setSlots]         = useState([])
  const [selectedSlots, setSelectedSlots] = useState([])
  const [loadingSlots,  setLoadingSlots]  = useState(false)
  const [sending,       setSending]       = useState(false)
  const [sent,          setSent]          = useState(false)
  const [err,           setErr]           = useState('')

  // Load interviewer availability when interviewer changes
  useEffect(() => {
    if (!interviewerId) { setSlots([]); setSelectedSlots([]); return }
    setLoadingSlots(true)
    availabilityApi.list(interviewerId)
      .then(r => setSlots((r.data || []).filter(s => !s.is_booked)))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false))
  }, [interviewerId])

  const candResults = useMemo(() => {
    if (!candSearch.trim()) return []
    const q = candSearch.toLowerCase()
    return allCandidates
      .filter(c => c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q))
      .slice(0, 8)
  }, [candSearch, allCandidates])

  function toggleSlot(slotId) {
    setSelectedSlots(prev =>
      prev.includes(slotId) ? prev.filter(id => id !== slotId) : [...prev, slotId]
    )
  }

  function fmtSlotLabel(slot) {
    try {
      const d = new Date(`${slot.slot_date}T00:00`)
      const dateStr = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
      const fmt = t => {
        const [h, m] = t.split(':').map(Number)
        return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
      }
      return `${dateStr} · ${fmt(slot.start_time)} – ${fmt(slot.end_time)}`
    } catch { return `${slot.slot_date} ${slot.start_time}` }
  }

  async function handleSend() {
    if (!selectedCand || !jobId || !interviewerId || selectedSlots.length === 0) return
    setSending(true); setErr('')
    try {
      await outreachApi.send({
        candidateId:      selectedCand.candidateId,
        jobId,
        interviewerId,
        offered_slot_ids: selectedSlots,
        personal_note:    note || null,
      })
      setSent(true)
      setTimeout(() => { onSent?.(); onClose() }, 2200)
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Failed to send email. Check email settings.')
    } finally { setSending(false) }
  }

  const canSend = selectedCand && jobId && interviewerId && selectedSlots.length > 0

  if (sent) {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-emerald-500" />
          </div>
          <h2 className="text-base font-semibold text-gray-900">Email Sent!</h2>
          <p className="text-sm text-gray-400 mt-1">
            Invitation sent to <strong className="text-gray-600">{selectedCand?.name}</strong>.
            Awaiting their response.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-purple-500" /> Send Interest Email
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Invite a candidate — they'll receive slots to self-schedule
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Candidate search */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Candidate</label>
            {selectedCand ? (
              <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#49029F,#7c3aed)' }}>
                    {selectedCand.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{selectedCand.name}</p>
                    {selectedCand.email && <p className="text-xs text-gray-400 truncate">{selectedCand.email}</p>}
                  </div>
                </div>
                <button type="button" onClick={() => { setSelectedCand(null); setCandSearch('') }}
                  className="text-gray-300 hover:text-gray-500 ml-2 flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <div className="relative">
                <input type="text" value={candSearch} onChange={e => setCandSearch(e.target.value)}
                  placeholder="Search candidate by name or email…"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-50" />
                {candResults.length > 0 && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-lg z-10 max-h-44 overflow-y-auto">
                    {candResults.map(c => (
                      <button key={c.candidateId} type="button"
                        onClick={() => { setSelectedCand(c); setCandSearch('') }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-purple-50 transition-colors text-left">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg,#49029F,#7c3aed)' }}>
                          {c.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                          {c.email && <p className="text-xs text-gray-400 truncate">{c.email}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Job + Interviewer */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Job</label>
              <select value={jobId} onChange={e => setJobId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-purple-300 bg-white">
                <option value="">Select job…</option>
                {jobs.map(j => <option key={j.jobId} value={j.jobId}>{j.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Interviewer</label>
              <select value={interviewerId} onChange={e => setInterviewerId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-purple-300 bg-white">
                <option value="">Select interviewer…</option>
                {interviewers.map(iv => <option key={iv.interviewerId} value={iv.interviewerId}>{iv.name}</option>)}
              </select>
            </div>
          </div>

          {/* Available slots */}
          {interviewerId && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Slots to Offer
                <span className="ml-1 text-gray-400 font-normal">(check all you want to offer)</span>
              </label>
              {loadingSlots ? (
                <div className="flex items-center gap-2 py-3 text-gray-400 text-xs">
                  <QlogoLoader size={14} /> Loading slots…
                </div>
              ) : slots.length === 0 ? (
                <div className="px-3 py-3 bg-amber-50 border border-amber-100 rounded-xl">
                  <p className="text-xs text-amber-700 font-medium">No availability slots set for this interviewer.</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Go to <Link to="/interviewers" className="underline" onClick={onClose}>Interviewers page</Link> → Availability button to add slots first.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-44 overflow-y-auto">
                  {slots.map(slot => (
                    <label key={slot.slotId}
                      className={`flex items-center gap-3 px-3 py-2.5 border rounded-xl cursor-pointer transition-all ${
                        selectedSlots.includes(slot.slotId)
                          ? 'border-purple-300 bg-purple-50'
                          : 'border-gray-100 hover:border-purple-200 hover:bg-purple-50/30'
                      }`}>
                      <input type="checkbox"
                        checked={selectedSlots.includes(slot.slotId)}
                        onChange={() => toggleSlot(slot.slotId)}
                        className="accent-purple-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-800">{fmtSlotLabel(slot)}</p>
                        <p className="text-[10px] text-gray-400">{slot.duration_mins} min</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Personal note */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Personal Note <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea value={note} rows={2}
              placeholder="Add a personal message to the candidate…"
              onChange={e => setNote(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-purple-300 resize-none" />
          </div>

          {err && <p className="text-xs text-red-500">{err}</p>}

          {!canSend && (
            <p className="text-xs text-gray-400">
              {!selectedCand ? 'Select a candidate'
                : !jobId ? 'Select a job'
                : !interviewerId ? 'Select an interviewer'
                : 'Check at least one time slot to offer'}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSend} disabled={!canSend || sending}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white rounded-xl disabled:opacity-40 transition-all"
              style={{ background: 'linear-gradient(135deg,#49029F,#7c3aed)' }}>
              <Send className="w-3.5 h-3.5" />
              {sending ? 'Sending…' : `Send to ${selectedCand?.name || 'Candidate'}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function Interviews() {
  const [interviews,    setInterviews]    = useState([])
  const [loading,       setLoading]       = useState(true)
  const [allCandidates, setAllCandidates] = useState([])
  const [jobs,          setJobs]          = useState([])
  const [interviewers,  setInterviewers]  = useState([])

  // Create modal
  const [showCreate,   setShowCreate]   = useState(false)
  const [candSearch,   setCandSearch]   = useState('')
  const [selectedCand, setSelectedCand] = useState(null)
  const [candName,     setCandName]     = useState('')
  const [candEmail,    setCandEmail]    = useState('')
  const [form,         setForm]         = useState(BLANK_FORM)
  const [creating,     setCreating]     = useState(false)

  // Edit modal
  const [editing,  setEditing]  = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving,   setSaving]   = useState(false)

  // Filters
  const [filterStatus,      setFilterStatus]      = useState('')
  const [filterInterviewer, setFilterInterviewer] = useState('')
  const [viewTab,           setViewTab]           = useState('upcoming')

  // Outlook / Teams
  const [msConnected,    setMsConnected]    = useState(false)
  const [generatingLink, setGeneratingLink] = useState(false)

  // Outreach modal
  const [showOutreach, setShowOutreach] = useState(false)

  // Flash
  const [flash, setFlash] = useState(null)
  function showFlash(msg, type = 'success') {
    setFlash({ msg, type })
    setTimeout(() => setFlash(null), 3500)
  }

  useEffect(() => {
    load()
    candidatesApi.listAll({ limit: 500 }).then(r => setAllCandidates(r.data?.candidates || [])).catch(() => {})
    jobsApi.list().then(r => setJobs(r.data || [])).catch(() => {})
    interviewersApi.list().then(r => setInterviewers(r.data || [])).catch(() => {})
    msGraphApi.status().then(r => setMsConnected(r.data?.connected || false)).catch(() => {})
  }, [])

  async function load() {
    setLoading(true)
    try {
      const r = await interviewsApi.list()
      setInterviews(r.data || [])
    } catch { }
    finally { setLoading(false) }
  }

  // Client-side candidate search
  const candResults = useMemo(() => {
    if (!candSearch.trim()) return []
    const q = candSearch.toLowerCase()
    return allCandidates
      .filter(c => c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q))
      .slice(0, 8)
  }, [candSearch, allCandidates])

  const today   = new Date().toISOString().slice(0, 10)
  const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

  // KPIs
  const kpi = useMemo(() => ({
    today:     interviews.filter(i => i.scheduled_at?.slice(0, 10) === today).length,
    week:      interviews.filter(i => { const d = i.scheduled_at?.slice(0, 10); return d >= today && d <= weekEnd }).length,
    upcoming:  interviews.filter(i => i.status === 'scheduled').length,
    completed: interviews.filter(i => i.status === 'completed').length,
  }), [interviews, today, weekEnd])

  // Filtered + sorted list
  const filteredInterviews = useMemo(() => {
    let list = interviews
    if (filterStatus)      list = list.filter(i => i.status === filterStatus)
    if (filterInterviewer) list = list.filter(i => i.interviewerId === filterInterviewer)
    if (viewTab === 'upcoming') list = list.filter(i =>
      (i.scheduled_at?.slice(0, 10) || '') >= today && i.status !== 'cancelled'
    )
    if (viewTab === 'past') list = list.filter(i =>
      (i.scheduled_at?.slice(0, 10) || '') < today ||
      ['completed', 'cancelled', 'no_show'].includes(i.status)
    )
    return [...list].sort((a, b) => (a.scheduled_at || '') < (b.scheduled_at || '') ? -1 : 1)
  }, [interviews, filterStatus, filterInterviewer, viewTab, today])

  // Group by date
  const { grouped, sortedDates } = useMemo(() => {
    const g = {}
    for (const iv of filteredInterviews) {
      const d = iv.scheduled_at?.slice(0, 10) || 'unknown'
      if (!g[d]) g[d] = []
      g[d].push(iv)
    }
    return { grouped: g, sortedDates: Object.keys(g).sort() }
  }, [filteredInterviews])

  // ── handlers ────────────────────────────────────────────────────────────────
  async function handleCreate(e) {
    e.preventDefault()
    if (!candName.trim() || !candEmail.trim() || !form.jobId || !form.interviewerId || !form.datetime) return
    setCreating(true)
    try {
      let candidateId = selectedCand?.candidateId
      if (!candidateId) {
        const existing = allCandidates.find(c => c.email?.toLowerCase() === candEmail.trim().toLowerCase())
        if (existing) {
          candidateId = existing.candidateId
        } else {
          const created = await candidatesApi.add(form.jobId, { name: candName.trim(), email: candEmail.trim() })
          candidateId = created.data?.candidateId || created.data?.candidate_id
          if (candidateId) {
            setAllCandidates(prev => [...prev, { candidateId, name: candName.trim(), email: candEmail.trim() }])
          }
        }
      }
      if (!candidateId) throw new Error('Could not resolve candidate')
      const r = await interviewsApi.create({
        candidateId,
        jobId:         form.jobId,
        interviewerId: form.interviewerId,
        round:         parseInt(form.round),
        type:          form.type,
        scheduled_at:  new Date(form.datetime).toISOString(),
        duration_mins: parseInt(form.duration_mins),
        meeting_link:  form.meeting_link || null,
        location:      form.location || null,
        notes:         form.notes || null,
      })
      setInterviews(prev => [...prev, r.data])
      setShowCreate(false)
      setSelectedCand(null)
      setCandSearch('')
      setCandName('')
      setCandEmail('')
      setForm(BLANK_FORM)
      showFlash('Interview scheduled!')
    } catch (err) {
      showFlash(err.response?.data?.detail || 'Failed to schedule', 'error')
    } finally { setCreating(false) }
  }

  async function handleUpdate(e) {
    e.preventDefault()
    if (!editing) return
    setSaving(true)
    try {
      const payload = {
        status:        editForm.status,
        meeting_link:  editForm.meeting_link,
        location:      editForm.location,
        notes:         editForm.notes,
        feedback:      editForm.feedback,
        rating:        editForm.rating,
        duration_mins: editForm.duration_mins ? parseInt(editForm.duration_mins) : undefined,
      }
      if (editForm.datetime) payload.scheduled_at = new Date(editForm.datetime).toISOString()
      const r = await interviewsApi.update(editing.interviewId, payload)
      setInterviews(prev => prev.map(i => i.interviewId === editing.interviewId ? r.data : i))
      setEditing(null)
      showFlash('Interview updated!')
    } catch (err) {
      showFlash(err.response?.data?.detail || 'Failed to update', 'error')
    } finally { setSaving(false) }
  }

  async function handleDelete(iv) {
    if (!window.confirm(`Delete this interview with ${iv.candidateName}?`)) return
    try {
      await interviewsApi.delete(iv.interviewId)
      setInterviews(prev => prev.filter(i => i.interviewId !== iv.interviewId))
      showFlash('Interview removed.')
    } catch { showFlash('Failed to delete', 'error') }
  }

  function openEdit(iv) {
    setEditing(iv)
    const localDt = iv.scheduled_at
      ? new Date(iv.scheduled_at).toLocaleString('sv-SE').slice(0, 16).replace(' ', 'T')
      : ''
    setEditForm({
      status:        iv.status || 'scheduled',
      datetime:      localDt,
      duration_mins: iv.duration_mins || 60,
      meeting_link:  iv.meeting_link || '',
      location:      iv.location || '',
      notes:         iv.notes || '',
      feedback:      iv.feedback || '',
      rating:        iv.rating || null,
    })
  }

  async function generateTeamsLink(targetForm, setTargetForm) {
    if (!msConnected) return
    setGeneratingLink(true)
    try {
      const start = targetForm.datetime
        ? new Date(targetForm.datetime)
        : new Date(Date.now() + 86400000)
      const end = new Date(start.getTime() + (parseInt(targetForm.duration_mins) || 60) * 60000)
      const candidateLabel = candName.trim() || 'Candidate'
      const jobLabel = jobs.find(j => j.jobId === targetForm.jobId)?.title || 'Interview'
      const r = await msGraphApi.createMeeting({
        subject:       `Interview: ${candidateLabel} — ${jobLabel}`,
        startDateTime: start.toISOString(),
        endDateTime:   end.toISOString(),
      })
      if (r.data?.joinUrl) {
        setTargetForm(f => ({ ...f, meeting_link: r.data.joinUrl }))
        showFlash('Teams link generated!')
      }
    } catch (err) {
      showFlash(err.response?.data?.detail || 'Failed to generate Teams link', 'error')
    } finally {
      setGeneratingLink(false)
    }
  }

  function closeCreate() {
    setShowCreate(false)
    setSelectedCand(null)
    setCandSearch('')
    setCandName('')
    setCandEmail('')
    setForm(BLANK_FORM)
  }

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="px-6 py-5 w-full">

      {/* Outreach modal */}
      {showOutreach && (
        <OutreachModal
          allCandidates={allCandidates}
          jobs={jobs}
          interviewers={interviewers}
          onClose={() => setShowOutreach(false)}
          onSent={() => showFlash('Invitation email sent!')}
        />
      )}

      {/* Flash */}
      {flash && (
        <div className={`fixed top-5 right-5 z-[100] px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium transition-all ${
          flash.type === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
        }`}>
          {flash.msg}
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Interview Schedule</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage and track all candidate interviews</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowOutreach(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-xl hover:bg-purple-100 transition-colors">
            <Mail className="w-4 h-4" /> Invite Candidate
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-xl shadow-sm hover:shadow-md transition-all"
            style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
            <Plus className="w-4 h-4" />Schedule Interview
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Today',     value: kpi.today,     color: 'text-purple-700', bg: 'bg-purple-50' },
          { label: 'This Week', value: kpi.week,       color: 'text-blue-700',   bg: 'bg-blue-50' },
          { label: 'Upcoming',  value: kpi.upcoming,  color: 'text-amber-700',  bg: 'bg-amber-50' },
          { label: 'Completed', value: kpi.completed, color: 'text-emerald-700',bg: 'bg-emerald-50' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-400">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs + Filters */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 gap-0.5">
          {['upcoming', 'all', 'past'].map(tab => (
            <button key={tab} onClick={() => setViewTab(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                viewTab === tab
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 bg-white text-gray-600 focus:outline-none focus:border-purple-300">
            <option value="">All Statuses</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select value={filterInterviewer} onChange={e => setFilterInterviewer(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 bg-white text-gray-600 focus:outline-none focus:border-purple-300">
            <option value="">All Interviewers</option>
            {interviewers.map(iv => (
              <option key={iv.interviewerId} value={iv.interviewerId}>{iv.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Interview list */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <QlogoLoader size={40} label="Loading interviews…" />
        </div>
      ) : sortedDates.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <Calendar className="w-10 h-10 text-gray-200 mb-3" />
          <p className="text-sm font-medium text-gray-500">No interviews found</p>
          <p className="text-xs text-gray-400 mt-1">
            {viewTab === 'upcoming' ? "No upcoming interviews. Schedule one!" : "Nothing here yet."}
          </p>
          <button onClick={() => setShowCreate(true)}
            className="mt-3 px-4 py-2 text-xs font-medium text-white rounded-xl"
            style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
            Schedule Interview
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {sortedDates.map(date => (
            <div key={date}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
                {fmtDateLabel(date)}
              </p>
              <div className="space-y-2">
                {grouped[date].map(iv => (
                  <InterviewCard key={iv.interviewId} iv={iv} today={today}
                    onEdit={openEdit} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create modal ──────────────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={closeCreate}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Schedule Interview</h2>
              <button onClick={closeCreate} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="px-6 py-4 space-y-4">
              {/* Candidate search */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Search Existing Candidate <span className="text-gray-400 font-normal">(optional — or fill name & email below)</span>
                </label>
                {selectedCand ? (
                  <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
                        {selectedCand.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{selectedCand.name}</p>
                        {selectedCand.email && <p className="text-xs text-gray-400 truncate">{selectedCand.email}</p>}
                      </div>
                    </div>
                    <button type="button" onClick={() => { setSelectedCand(null); setCandSearch(''); setCandName(''); setCandEmail('') }}
                      className="text-gray-300 hover:text-gray-500 flex-shrink-0 ml-2">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text" value={candSearch} onChange={e => setCandSearch(e.target.value)}
                      placeholder="Search candidate by name or email…"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-50"
                    />
                    {candResults.length > 0 && (
                      <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
                        {candResults.map(c => (
                          <button key={c.candidateId} type="button"
                            onClick={() => { setSelectedCand(c); setCandSearch(''); setCandName(c.name || ''); setCandEmail(c.email || '') }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-purple-50 transition-colors text-left">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
                              {c.name?.charAt(0)?.toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                              {c.email && <p className="text-xs text-gray-400 truncate">{c.email}</p>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Mandatory name + email fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Candidate Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={candName}
                    onChange={e => setCandName(e.target.value)}
                    placeholder="Full name"
                    className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-50 ${
                      !candName.trim() ? 'border-red-200 bg-red-50/30' : 'border-gray-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Candidate Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={candEmail}
                    onChange={e => setCandEmail(e.target.value)}
                    placeholder="email@example.com"
                    className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-50 ${
                      !candEmail.trim() ? 'border-red-200 bg-red-50/30' : 'border-gray-200'
                    }`}
                  />
                </div>
              </div>

              {/* Job + Interviewer */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Job</label>
                  <select value={form.jobId} onChange={e => setForm(f => ({ ...f, jobId: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-purple-300 bg-white">
                    <option value="">Select job…</option>
                    {jobs.map(j => <option key={j.jobId} value={j.jobId}>{j.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Interviewer</label>
                  {interviewers.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl">
                      No interviewers added yet.{' '}
                      <Link to="/interviewers" className="underline">Add one →</Link>
                    </div>
                  ) : (
                    <select value={form.interviewerId} onChange={e => setForm(f => ({ ...f, interviewerId: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-purple-300 bg-white">
                      <option value="">Select interviewer…</option>
                      {interviewers.map(iv => <option key={iv.interviewerId} value={iv.interviewerId}>{iv.name}</option>)}
                    </select>
                  )}
                </div>
              </div>

              {/* Round + Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Round</label>
                  <input type="number" min="1" max="10" value={form.round}
                    onChange={e => setForm(f => ({ ...f, round: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-purple-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Type</label>
                  <div className="flex rounded-xl overflow-hidden border border-gray-200">
                    {Object.entries(TYPE_CFG).map(([k, v]) => {
                      const Icon = v.Icon
                      return (
                        <button key={k} type="button" onClick={() => setForm(f => ({ ...f, type: k }))}
                          className={`flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-medium transition-all ${
                            form.type === k
                              ? 'bg-purple-600 text-white'
                              : 'bg-white text-gray-500 hover:bg-gray-50'
                          }`}>
                          <Icon className="w-3 h-3" />{v.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Date/time + Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Date & Time</label>
                  <DateTimePicker
                    value={form.datetime}
                    onChange={e => setForm(f => ({ ...f, datetime: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-purple-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Duration</label>
                  <div className="flex rounded-xl overflow-hidden border border-gray-200">
                    {DURATIONS.map(d => (
                      <button key={d} type="button" onClick={() => setForm(f => ({ ...f, duration_mins: d }))}
                        className={`flex-1 py-2 text-[11px] font-medium transition-all ${
                          form.duration_mins === d
                            ? 'bg-purple-600 text-white'
                            : 'bg-white text-gray-500 hover:bg-gray-50'
                        }`}>
                        {d}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Meeting link */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Meeting Link <span className="text-gray-400 font-normal">(optional)</span></label>
                <div className="flex gap-2">
                  <input type="url" value={form.meeting_link} placeholder="https://meet.google.com/…"
                    onChange={e => setForm(f => ({ ...f, meeting_link: e.target.value }))}
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-purple-300" />
                  <button
                    type="button"
                    onClick={() => generateTeamsLink(form, setForm)}
                    disabled={generatingLink || !msConnected}
                    title={!msConnected ? 'Connect Outlook in Account settings to generate Teams links' : 'Generate Microsoft Teams meeting link'}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all disabled:opacity-40 whitespace-nowrap flex-shrink-0"
                    style={{ background: '#6264a7', color: 'white' }}>
                    {generatingLink
                      ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      : <Video className="w-3.5 h-3.5" />}
                    Teams
                  </button>
                </div>
                {!msConnected && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    <Link to="/account" className="underline text-purple-500">Connect Outlook</Link> in Account settings to generate Teams links
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea value={form.notes} rows={2} placeholder="Pre-interview notes, topics to cover…"
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-purple-300 resize-none" />
              </div>

              {(!candName.trim() || !candEmail.trim() || !form.jobId || !form.interviewerId || !form.datetime) && (
                <p className="text-xs text-red-400">
                  {!candName.trim() ? 'Candidate name is required'
                    : !candEmail.trim() ? 'Candidate email is required'
                    : !form.jobId ? 'Select a job'
                    : !form.interviewerId ? 'Select an interviewer'
                    : 'Choose date and time'}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeCreate}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={creating || !candName.trim() || !candEmail.trim() || !form.jobId || !form.interviewerId || !form.datetime}
                  className="px-5 py-2 text-sm font-medium text-white rounded-xl disabled:opacity-40 transition-all"
                  style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
                  {creating ? 'Scheduling…' : 'Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit modal ────────────────────────────────────────────────────────── */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Edit Interview</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {editing.candidateName} · Round {editing.round} · {editing.jobTitle}
                </p>
              </div>
              <button onClick={() => setEditing(null)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="px-6 py-4 space-y-4">
              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Status</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(STATUS_CFG).map(([k, v]) => (
                    <button key={k} type="button" onClick={() => setEditForm(f => ({ ...f, status: k }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                        editForm.status === k
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reschedule */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Reschedule</label>
                  <DateTimePicker
                    value={editForm.datetime}
                    onChange={e => setEditForm(f => ({ ...f, datetime: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-purple-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Duration</label>
                  <div className="flex rounded-xl overflow-hidden border border-gray-200">
                    {DURATIONS.map(d => (
                      <button key={d} type="button"
                        onClick={() => setEditForm(f => ({ ...f, duration_mins: d }))}
                        className={`flex-1 py-2 text-[11px] font-medium transition-all ${
                          parseInt(editForm.duration_mins) === d
                            ? 'bg-purple-600 text-white'
                            : 'bg-white text-gray-500 hover:bg-gray-50'
                        }`}>
                        {d}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Meeting link */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Meeting Link</label>
                <div className="flex gap-2">
                  <input type="url" value={editForm.meeting_link} placeholder="https://…"
                    onChange={e => setEditForm(f => ({ ...f, meeting_link: e.target.value }))}
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-purple-300" />
                  <button
                    type="button"
                    onClick={() => generateTeamsLink(editForm, setEditForm)}
                    disabled={generatingLink || !msConnected}
                    title={!msConnected ? 'Connect Outlook in Account settings to generate Teams links' : 'Generate Microsoft Teams meeting link'}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all disabled:opacity-40 whitespace-nowrap flex-shrink-0"
                    style={{ background: '#6264a7', color: 'white' }}>
                    {generatingLink
                      ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      : <Video className="w-3.5 h-3.5" />}
                    Teams
                  </button>
                </div>
                {!msConnected && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    <Link to="/account" className="underline text-purple-500">Connect Outlook</Link> in Account settings to generate Teams links
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Notes</label>
                <textarea value={editForm.notes} rows={2}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-purple-300 resize-none" />
              </div>

              {/* Feedback + Rating (shown when status is completed) */}
              {editForm.status === 'completed' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Feedback</label>
                    <textarea value={editForm.feedback} rows={3}
                      placeholder="How did the interview go? Any observations…"
                      onChange={e => setEditForm(f => ({ ...f, feedback: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-purple-300 resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Rating</label>
                    <StarRating value={editForm.rating}
                      onChange={n => setEditForm(f => ({ ...f, rating: n }))} />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditing(null)}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="px-5 py-2 text-sm font-medium text-white rounded-xl disabled:opacity-40 transition-all"
                  style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
