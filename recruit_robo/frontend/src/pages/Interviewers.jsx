import { useState, useEffect } from 'react'
import QlogoLoader from '../components/QlogoLoader'
import { interviewersApi, jobsApi, candidatesApi, availabilityApi } from '../api'
import {
  Users, UserPlus, Calendar, ChevronDown, ChevronUp, RefreshCw, X, Trash2, UserCheck,
  Clock, Plus, CalendarCheck,
} from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatChip({ value, color }) {
  const cls = {
    zinc:    'bg-gray-100 text-gray-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    red:     'bg-red-50 text-red-600',
    blue:    'bg-blue-50 text-blue-700',
  }
  return (
    <span className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-semibold ${cls[color] || cls.zinc}`}>
      {value}
    </span>
  )
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) +
    ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

// ── Add Interviewer Modal ─────────────────────────────────────────────────────

function AddModal({ onClose, onAdded }) {
  const [form,   setForm]   = useState({ name: '', email: '', phone: '', department: '' })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim()) { setError('Name and email are required'); return }
    setSaving(true); setError('')
    try {
      const r = await interviewersApi.add(form)
      onAdded(r.data)
      onClose()
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to add interviewer')
    } finally { setSaving(false) }
  }

  const INPUT = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Add Interviewer</h2>
            <p className="text-xs text-gray-400 mt-0.5">Add a team member to conduct interviews</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Full Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="e.g. Arjun Sharma" className={INPUT} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Email Address *</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="e.g. arjun@company.com" className={INPUT} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="+91 98765 43210" className={INPUT} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Department</label>
              <input value={form.department} onChange={e => set('department', e.target.value)}
                placeholder="Engineering" className={INPUT} />
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={handleSubmit} disabled={saving}
              className="flex-1 py-2 text-white disabled:opacity-40 text-sm font-medium rounded-xl transition-all shadow-sm hover:shadow-md"
              style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
              {saving ? 'Adding…' : 'Add Interviewer'}
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

// ── Availability Modal ────────────────────────────────────────────────────────

function AvailabilityModal({ interviewer, onClose }) {
  const [slots,   setSlots]   = useState([])
  const [loading, setLoading] = useState(true)
  const [adding,  setAdding]  = useState(false)
  const [form,    setForm]    = useState({ slot_date: '', start_time: '', end_time: '' })
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState('')

  useEffect(() => {
    availabilityApi.list(interviewer.interviewerId)
      .then(r => setSlots(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [interviewer.interviewerId])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function calcDuration(start, end) {
    try {
      const [sh, sm] = start.split(':').map(Number)
      const [eh, em] = end.split(':').map(Number)
      return (eh * 60 + em) - (sh * 60 + sm)
    } catch { return 60 }
  }

  async function handleAdd() {
    if (!form.slot_date || !form.start_time || !form.end_time) {
      setErr('Date, start and end time are required')
      return
    }
    const dur = calcDuration(form.start_time, form.end_time)
    if (dur <= 0) { setErr('End time must be after start time'); return }
    setSaving(true); setErr('')
    try {
      const r = await availabilityApi.add(interviewer.interviewerId, {
        slot_date: form.slot_date, start_time: form.start_time,
        end_time: form.end_time, duration_mins: dur,
      })
      setSlots(prev => [...prev, r.data])
      setForm({ slot_date: '', start_time: '', end_time: '' })
      setAdding(false)
    } catch (e) { setErr(e?.response?.data?.detail || 'Failed to add slot') }
    finally { setSaving(false) }
  }

  async function handleDelete(slotId) {
    try {
      await availabilityApi.remove(interviewer.interviewerId, slotId)
      setSlots(prev => prev.filter(s => s.slotId !== slotId))
    } catch { /* silent */ }
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

  const INPUT = 'border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Set Availability</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              <span className="font-medium text-gray-600">{interviewer.name}</span> — upcoming interview slots
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>

        {/* Slot list */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center gap-2 py-6 text-gray-400 text-sm justify-center">
              <QlogoLoader size={16} />Loading slots…
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-8">
              <CalendarCheck className="w-7 h-7 text-gray-200 mx-auto mb-2" />
              <p className="text-xs text-gray-400">No availability slots yet.</p>
              <p className="text-xs text-gray-400">Add slots below so candidates can self-schedule.</p>
            </div>
          ) : (
            <div className="space-y-1.5 mb-4">
              {slots.map(s => (
                <div key={s.slotId} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${
                  s.is_booked ? 'border-gray-100 bg-gray-50 opacity-60' : 'border-purple-100 bg-purple-50/40'
                }`}>
                  <Clock className={`w-3.5 h-3.5 flex-shrink-0 ${s.is_booked ? 'text-gray-300' : 'text-purple-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{fmtSlotLabel(s)}</p>
                    <p className="text-[10px] text-gray-400">{s.duration_mins} min
                      {s.is_booked && <span className="ml-1.5 text-amber-600 font-medium">· Booked</span>}
                    </p>
                  </div>
                  {!s.is_booked && (
                    <button onClick={() => handleDelete(s.slotId)}
                      className="p-1 text-gray-300 hover:text-red-400 transition-colors rounded">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add slot toggle */}
          {!adding ? (
            <button onClick={() => setAdding(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-purple-300 rounded-xl text-xs font-medium text-purple-600 hover:bg-purple-50 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Slot
            </button>
          ) : (
            <div className="border border-gray-200 rounded-xl p-3.5 space-y-3 bg-gray-50">
              <p className="text-xs font-medium text-gray-700">New Slot</p>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Date</label>
                <input type="date" value={form.slot_date} onChange={e => set('slot_date', e.target.value)}
                  className={`w-full ${INPUT}`} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">Start Time</label>
                  <input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)}
                    className={`w-full ${INPUT}`} />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">End Time</label>
                  <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)}
                    className={`w-full ${INPUT}`} />
                </div>
              </div>
              {form.start_time && form.end_time && calcDuration(form.start_time, form.end_time) > 0 && (
                <p className="text-[10px] text-gray-400">
                  Duration: {calcDuration(form.start_time, form.end_time)} minutes
                </p>
              )}
              {err && <p className="text-[11px] text-red-500">{err}</p>}
              <div className="flex gap-2">
                <button onClick={handleAdd} disabled={saving}
                  className="flex-1 py-1.5 text-white text-xs font-medium rounded-lg disabled:opacity-40 transition-all"
                  style={{ background: 'linear-gradient(135deg,#49029F,#7c3aed)' }}>
                  {saving ? 'Adding…' : 'Add Slot'}
                </button>
                <button onClick={() => { setAdding(false); setErr('') }}
                  className="flex-1 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-100 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100">
          <button onClick={onClose}
            className="w-full py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Assign Candidate Modal ────────────────────────────────────────────────────

function AssignModal({ interviewer, onClose, onAssigned }) {
  const [jobs,              setJobs]              = useState([])
  const [selectedJob,       setSelectedJob]       = useState('')
  const [candidates,        setCandidates]        = useState([])
  const [loadingCandidates, setLoadingCandidates] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [round,             setRound]             = useState(1)
  const [scheduledDate,     setScheduledDate]     = useState('')
  const [assigning,         setAssigning]         = useState(false)
  const [error,             setError]             = useState('')

  useEffect(() => { jobsApi.list().then(r => setJobs(r.data)).catch(() => {}) }, [])

  useEffect(() => {
    if (!selectedJob) { setCandidates([]); setSelectedCandidate(null); return }
    setLoadingCandidates(true)
    candidatesApi.top(selectedJob, 25)
      .then(r => setCandidates(r.data))
      .catch(() => setCandidates([]))
      .finally(() => setLoadingCandidates(false))
  }, [selectedJob])

  const handleAssign = async () => {
    if (!selectedCandidate || !selectedJob) { setError('Select a job and candidate'); return }
    setAssigning(true); setError('')
    try {
      await interviewersApi.assign(interviewer.interviewerId, {
        candidateId:   selectedCandidate.candidateId,
        jobId:         selectedJob,
        round,
        scheduledDate: scheduledDate || null,
      })
      onAssigned()
      onClose()
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to assign candidate')
    } finally { setAssigning(false) }
  }

  const pct = s => Math.round((s || 0) * 100)
  const scoreColor = s => pct(s) >= 80 ? 'text-emerald-600' : pct(s) >= 60 ? 'text-amber-600' : 'text-red-500'

  const SELECT = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[88vh]" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Assign Candidate</h2>
            <p className="text-xs text-gray-400 mt-0.5">to <span className="font-medium text-gray-600">{interviewer.name}</span></p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Job selector */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Select Job *</label>
            <select value={selectedJob} onChange={e => setSelectedJob(e.target.value)} className={SELECT}>
              <option value="">— Choose a job —</option>
              {jobs.map(j => <option key={j.jobId} value={j.jobId}>{j.title}</option>)}
            </select>
          </div>

          {/* Candidate list */}
          {selectedJob && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Select Candidate * <span className="font-normal text-gray-400">(sorted by match score)</span>
              </label>
              {loadingCandidates ? (
                <div className="flex items-center gap-2 py-4 text-gray-400 text-sm">
                  <QlogoLoader size={14} /> Loading candidates…
                </div>
              ) : candidates.length === 0 ? (
                <p className="text-xs text-gray-400 py-4">No candidates for this job yet.</p>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                  {candidates.map(c => {
                    const active = selectedCandidate?.candidateId === c.candidateId
                    return (
                      <button key={c.candidateId} onClick={() => setSelectedCandidate(c)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-gray-50 last:border-0
                          ${active ? 'text-white' : 'hover:bg-gray-50'}`}
                        style={active ? { background: 'linear-gradient(135deg, #49029F, #7c3aed)' } : {}}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                          ${active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                          {c.name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{c.name}</p>
                          <p className={`text-xs truncate ${active ? 'text-gray-300' : 'text-gray-400'}`}>
                            {c.email} · {c.status?.replace('_', ' ')}
                          </p>
                        </div>
                        <span className={`text-xs font-bold flex-shrink-0 ${active ? 'text-white' : scoreColor(c.match_score)}`}>
                          {pct(c.match_score)}%
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Round + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Interview Round</label>
              <select value={round} onChange={e => setRound(Number(e.target.value))} className={SELECT}>
                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>Round {n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Scheduled Date / Time</label>
              <input type="datetime-local" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition" />
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-gray-100">
          <button onClick={handleAssign} disabled={assigning || !selectedCandidate || !selectedJob}
            className="flex-1 py-2 text-white disabled:opacity-40 text-sm font-medium rounded-xl transition-all shadow-sm hover:shadow-md"
            style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
            {assigning ? 'Assigning…' : 'Assign Candidate'}
          </button>
          <button onClick={onClose}
            className="flex-1 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-xl transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Interviewer Row ───────────────────────────────────────────────────────────

function InterviewerRow({ iv, onDelete, onAssign, onAvailability }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <tr className="hover:bg-gray-50/80 transition-colors">
        <td className="px-3 py-1.5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600 flex-shrink-0">
              {iv.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-900 leading-tight">{iv.name}</p>
              <p className="text-[10px] text-gray-400 leading-tight">{iv.email}</p>
              {iv.phone && <p className="text-[10px] text-gray-400 leading-tight">{iv.phone}</p>}
            </div>
          </div>
        </td>
        <td className="px-3 py-1.5 border-b border-gray-100 border-l border-gray-100">
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded-full">
            {iv.department || '—'}
          </span>
        </td>
        <td className="px-3 py-1.5 border-b border-gray-100 border-l border-gray-100 text-center">
          <StatChip value={iv.total_assigned} color="zinc" />
        </td>
        <td className="px-3 py-1.5 border-b border-gray-100 border-l border-gray-100 text-center">
          <StatChip value={iv.selected} color="emerald" />
        </td>
        <td className="px-3 py-1.5 border-b border-gray-100 border-l border-gray-100 text-center">
          <StatChip value={iv.rejected} color="red" />
        </td>
        <td className="px-3 py-1.5 border-b border-gray-100 border-l border-gray-100 text-center">
          {iv.upcoming_count > 0 ? (
            <button onClick={() => setExpanded(v => !v)}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-semibold rounded-full hover:bg-blue-100 transition-colors">
              {iv.upcoming_count}
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          ) : (
            <span className="text-[11px] text-gray-300">—</span>
          )}
        </td>
        <td className="px-3 py-1.5 border-b border-gray-100 border-l border-gray-100">
          <div className="flex items-center gap-1">
            <button onClick={() => onAssign(iv)}
              className="flex items-center gap-1 px-2 py-1 text-white text-[10px] font-medium rounded-lg transition-all shadow-sm hover:shadow-md whitespace-nowrap"
              style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
              <UserCheck className="w-3 h-3" /> Assign
            </button>
            <button onClick={() => onAvailability(iv)}
              title="Set availability slots"
              className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-medium rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap">
              <CalendarCheck className="w-3 h-3" /> Availability
            </button>
            <button onClick={() => onDelete(iv.interviewerId)}
              className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Remove interviewer">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </td>
      </tr>

      {expanded && iv.upcoming?.length > 0 && (
        <tr className="bg-blue-50/40">
          <td colSpan={7} className="px-5 py-3">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Upcoming Interviews</p>
            <div className="space-y-1">
              {iv.upcoming.map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5 px-3 rounded-lg hover:bg-white text-xs">
                  <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="font-medium text-gray-700 flex-1 truncate">{item.candidateName}</span>
                  <span className="text-gray-400 truncate max-w-[160px]">{item.jobTitle}</span>
                  <span className="text-gray-400 whitespace-nowrap">Round {item.round ?? 1}</span>
                  <span className="text-gray-500 whitespace-nowrap">{formatDate(item.start)}</span>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Interviewers() {
  const [data,            setData]            = useState([])
  const [loading,         setLoading]         = useState(true)
  const [refreshing,      setRefreshing]      = useState(false)
  const [showAdd,         setShowAdd]         = useState(false)
  const [assignTarget,    setAssignTarget]    = useState(null)
  const [availTarget,     setAvailTarget]     = useState(null)

  const load = async (quiet = false) => {
    quiet ? setRefreshing(true) : setLoading(true)
    try {
      const r = await interviewersApi.list()
      setData(r.data)
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this interviewer?')) return
    try {
      await interviewersApi.remove(id)
      setData(prev => prev.filter(iv => iv.interviewerId !== id))
    } catch { /* silent */ }
  }

  const totalAssigned  = data.reduce((s, iv) => s + iv.total_assigned, 0)
  const totalSelected  = data.reduce((s, iv) => s + iv.selected, 0)
  const totalRejected  = data.reduce((s, iv) => s + iv.rejected, 0)
  const totalUpcoming  = data.reduce((s, iv) => s + iv.upcoming_count, 0)

  return (
    <div className="px-6 py-5 w-full">

      {showAdd && (
        <AddModal
          onClose={() => setShowAdd(false)}
          onAdded={iv => { setData(prev => [...prev, { ...iv, interviews_taken: 0, total_assigned: 0, selected: 0, rejected: 0, upcoming_count: 0, upcoming: [] }]) }}
        />
      )}

      {assignTarget && (
        <AssignModal
          interviewer={assignTarget}
          onClose={() => setAssignTarget(null)}
          onAssigned={() => load(true)}
        />
      )}

      {availTarget && (
        <AvailabilityModal
          interviewer={availTarget}
          onClose={() => setAvailTarget(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Interviewers</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage interviewers and assign shortlisted candidates</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load(true)} disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-medium rounded-lg transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-xl transition-all shadow-sm hover:shadow-md"
            style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
            <UserPlus className="w-4 h-4" /> Add Interviewer
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Interviewers',   value: data.length,    color: 'text-gray-900'    },
          { label: 'Candidates Assigned',  value: totalAssigned,  color: 'text-gray-900'    },
          { label: 'Candidates Selected',  value: totalSelected,  color: 'text-emerald-600' },
          { label: 'Candidates Rejected',  value: totalRejected,  color: 'text-red-500'     },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm">
            <p className={`text-2xl font-bold ${color}`}>{loading ? '—' : value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/60">
          <span className="text-xs font-semibold text-gray-700">Interviewer Overview</span>
          <span className="text-[11px] text-gray-400">
            {totalUpcoming > 0
              ? `${totalUpcoming} upcoming · click count to expand`
              : `${data.length} interviewer${data.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <QlogoLoader size={48} label="Loading interviewers…" />
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">No interviewers added yet</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">Add team members to start assigning candidates</p>
            <button onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-xl transition-all shadow-sm hover:shadow-md"
              style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
              <UserPlus className="w-4 h-4" /> Add First Interviewer
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Interviewer', 'Department', 'Total Assigned', 'Selected', 'Rejected', 'Upcoming', ''].map((h, i) => (
                    <th key={h} className={`px-3 py-2 text-left text-[11px] font-medium text-gray-500 bg-gray-50 border-b border-gray-100 whitespace-nowrap${i > 0 ? ' border-l border-gray-100' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map(iv => (
                  <InterviewerRow
                    key={iv.interviewerId}
                    iv={iv}
                    onDelete={handleDelete}
                    onAssign={setAssignTarget}
                    onAvailability={setAvailTarget}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}


