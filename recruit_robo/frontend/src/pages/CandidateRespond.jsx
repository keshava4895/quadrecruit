import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { outreachApi } from '../api'
import {
  Calendar, Clock, CheckCircle, XCircle, Video,
  ExternalLink, Briefcase, User, ChevronRight, Loader
} from 'lucide-react'

// ── helpers ───────────────────────────────────────────────────────────────────
function fmtSlot(slot) {
  try {
    const d = new Date(`${slot.slot_date}T${slot.start_time}`)
    const weekday = d.toLocaleDateString('en-US', { weekday: 'long' })
    const date    = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const fmt = t => {
      const [h, m] = t.split(':').map(Number)
      const ap = h < 12 ? 'AM' : 'PM'
      return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ap}`
    }
    return { weekday, date, start: fmt(slot.start_time), end: fmt(slot.end_time) }
  } catch {
    return { weekday: '', date: slot.slot_date, start: slot.start_time, end: slot.end_time }
  }
}

// ── sub-components ────────────────────────────────────────────────────────────
function Shell({ children }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f1f0f7' }}>
      {/* Minimal branded header */}
      <header className="bg-white border-b border-gray-100 flex items-center px-6 h-14 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#49029F,#7c3aed)' }}>
            <span className="text-white font-bold text-xs">RR</span>
          </div>
          <span className="text-sm font-semibold text-gray-700">Recruit Robo</span>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4 py-10">
        {children}
      </main>
    </div>
  )
}

// ── step: loading ─────────────────────────────────────────────────────────────
function StepLoading() {
  return (
    <Shell>
      <div className="text-center">
        <Loader className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Loading your invitation…</p>
      </div>
    </Shell>
  )
}

// ── step: error ───────────────────────────────────────────────────────────────
function StepError({ msg }) {
  return (
    <Shell>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center max-w-sm">
        <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <h2 className="text-base font-semibold text-gray-900 mb-1">Link not found</h2>
        <p className="text-sm text-gray-400">{msg || 'This invitation link is invalid or has expired.'}</p>
      </div>
    </Shell>
  )
}

// ── step: respond (initial choice) ───────────────────────────────────────────
function StepRespond({ outreach, onResponse, responding }) {
  return (
    <Shell>
      <div className="w-full max-w-lg">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header gradient */}
          <div className="px-8 py-7" style={{ background: 'linear-gradient(135deg,#49029F,#7c3aed)' }}>
            <p className="text-purple-200 text-xs font-medium uppercase tracking-wide mb-1">
              Job Opportunity
            </p>
            <h1 className="text-white text-xl font-bold leading-tight">{outreach.jobTitle}</h1>
            <p className="text-purple-200 text-sm mt-1.5">
              You've been personally invited by <strong className="text-white">{outreach.hrName}</strong>
            </p>
          </div>

          <div className="px-8 py-6 space-y-5">
            {/* Interviewer pill */}
            <div className="flex items-center gap-3 bg-purple-50 rounded-xl px-4 py-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#49029F,#7c3aed)' }}>
                {outreach.interviewerName?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <p className="text-xs text-gray-400">Will conduct your interview</p>
                <p className="text-sm font-semibold text-gray-900">{outreach.interviewerName}</p>
              </div>
            </div>

            {/* Personal note */}
            {outreach.personal_note && (
              <div className="border-l-2 border-purple-300 pl-4 py-1">
                <p className="text-xs text-gray-400 mb-1">Message from {outreach.hrName}</p>
                <p className="text-sm text-gray-700 leading-relaxed italic">"{outreach.personal_note}"</p>
              </div>
            )}

            <p className="text-sm text-gray-600 leading-relaxed">
              We'd love to have a conversation with you about this role.
              If you're interested, you'll be able to choose a time slot that works best for you.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col gap-2.5 pt-1">
              <button
                onClick={() => onResponse('interested')}
                disabled={responding}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all shadow-sm hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#49029F,#7c3aed)' }}>
                {responding === 'interested'
                  ? <Loader className="w-4 h-4 animate-spin" />
                  : <CheckCircle className="w-4 h-4" />}
                Yes, I'm Interested — Show Me Available Slots
              </button>
              <button
                onClick={() => onResponse('declined')}
                disabled={responding}
                className="w-full py-3 rounded-xl text-gray-600 font-medium text-sm bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {responding === 'declined'
                  ? <Loader className="w-4 h-4 animate-spin" />
                  : <XCircle className="w-4 h-4 text-gray-400" />}
                Not Interested at This Time
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Your response helps the team plan accordingly.
        </p>
      </div>
    </Shell>
  )
}

// ── step: slot picker ─────────────────────────────────────────────────────────
function StepPicker({ outreach, slots, onBook, booking }) {
  const [selected, setSelected] = useState(null)

  return (
    <Shell>
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span className="text-xs text-emerald-600 font-medium">Great! You're interested</span>
            </div>
            <h2 className="text-lg font-bold text-gray-900">Choose a Time Slot</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Pick a time that works best for your interview with {outreach.interviewerName}
            </p>
          </div>

          <div className="px-8 py-5">
            {slots.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-500 font-medium">No slots available right now</p>
                <p className="text-xs text-gray-400 mt-1">
                  The recruitment team will reach out to you directly to schedule.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {slots.map(slot => {
                  const f = fmtSlot(slot)
                  const isSelected = selected === slot.slotId
                  return (
                    <button
                      key={slot.slotId}
                      onClick={() => setSelected(slot.slotId)}
                      className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-100 bg-gray-50 hover:border-purple-200 hover:bg-purple-50/40'
                      }`}>
                      {/* Date block */}
                      <div className={`w-12 flex-shrink-0 flex flex-col items-center justify-center rounded-lg py-2 ${
                        isSelected ? 'bg-purple-600' : 'bg-white border border-gray-200'
                      }`}>
                        <span className={`text-lg font-bold leading-none ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                          {new Date(`${slot.slot_date}T00:00`).getDate()}
                        </span>
                        <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-purple-200' : 'text-gray-400'}`}>
                          {new Date(`${slot.slot_date}T00:00`).toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${isSelected ? 'text-purple-900' : 'text-gray-900'}`}>
                          {f.weekday}, {f.date}
                        </p>
                        <p className={`text-xs mt-0.5 flex items-center gap-1 ${isSelected ? 'text-purple-600' : 'text-gray-500'}`}>
                          <Clock className="w-3 h-3" />
                          {f.start} – {f.end} &nbsp;·&nbsp; {slot.duration_mins} min
                        </p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'border-purple-600 bg-purple-600' : 'border-gray-300'
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {slots.length > 0 && (
              <div className="mt-5">
                <button
                  onClick={() => selected && onBook(selected)}
                  disabled={!selected || booking}
                  className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all shadow-sm hover:shadow-md disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#49029F,#7c3aed)' }}>
                  {booking
                    ? <><Loader className="w-4 h-4 animate-spin" /> Confirming…</>
                    : <><CheckCircle className="w-4 h-4" /> Confirm This Slot</>}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  )
}

// ── step: confirmed ───────────────────────────────────────────────────────────
function StepConfirmed({ result }) {
  const fmtDt = iso => {
    try {
      const d = new Date(iso)
      return d.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      }) + ' at ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    } catch { return iso }
  }

  return (
    <Shell>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-8 py-7 text-center" style={{ background: 'linear-gradient(135deg,#49029F,#7c3aed)' }}>
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-white text-xl font-bold">Interview Confirmed!</h1>
            <p className="text-purple-200 text-sm mt-1">
              A confirmation email has been sent to you.
            </p>
          </div>

          <div className="px-8 py-6 space-y-4">
            {/* Details */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
              {[
                { icon: Briefcase, label: 'Role', value: result.jobTitle },
                { icon: Calendar,  label: 'Date & Time', value: fmtDt(result.scheduled_at) },
                { icon: Clock,     label: 'Duration', value: `${result.duration_mins} minutes` },
                { icon: User,      label: 'Interviewer', value: result.interviewerName },
              ].filter(r => r.value).map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <Icon className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] text-gray-400">{label}</p>
                    <p className="text-sm font-medium text-gray-800">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Meeting link */}
            {result.meeting_link && (
              <a
                href={result.meeting_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-semibold text-sm transition-all shadow-sm hover:shadow-md"
                style={{ background: 'linear-gradient(135deg,#49029F,#7c3aed)' }}>
                <Video className="w-4 h-4" />
                Join Meeting Link
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
            )}

            <p className="text-center text-xs text-gray-400">
              Please save the meeting link above. You'll also receive it by email.
            </p>
          </div>
        </div>
      </div>
    </Shell>
  )
}

// ── step: declined ────────────────────────────────────────────────────────────
function StepDeclined({ outreach }) {
  return (
    <Shell>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center max-w-sm w-full">
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-7 h-7 text-gray-400" />
        </div>
        <h2 className="text-base font-semibold text-gray-900 mb-1">Response Received</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          Thank you for letting us know, <strong>{outreach?.candidateName}</strong>.
          We appreciate your time and wish you the best.
        </p>
        <p className="text-xs text-gray-400 mt-4">
          If you change your mind, please reach out to the recruiter directly.
        </p>
      </div>
    </Shell>
  )
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function CandidateRespond() {
  const { token } = useParams()
  const [searchParams] = useSearchParams()
  const intent = searchParams.get('intent') // 'yes' | 'no' from email links

  const [pageState, setPageState] = useState('loading')
  // pageState: loading | error | respond | picker | confirmed | declined

  const [outreach,   setOutreach]   = useState(null)
  const [slots,      setSlots]      = useState([])
  const [booking,    setBooking]    = useState(false)
  const [bookResult, setBookResult] = useState(null)
  const [responding, setResponding] = useState(null)
  const [errMsg,     setErrMsg]     = useState('')

  useEffect(() => {
    if (!token) { setPageState('error'); setErrMsg('No token in URL.'); return }
    outreachApi.get(token)
      .then(r => {
        const { outreach: o, slots: s } = r.data
        setOutreach(o)
        setSlots(s || [])

        if (o.status === 'scheduled') {
          // Already booked — show confirmation with stored data
          setBookResult({
            jobTitle:         o.jobTitle,
            interviewerName:  o.interviewerName,
            scheduled_at:     o.scheduled_at,
            meeting_link:     o.meeting_link,
            duration_mins:    60,
          })
          setPageState('confirmed')
          return
        }
        if (o.status === 'declined') { setPageState('declined'); return }

        // If email link carried an intent, process it right away
        if (intent === 'yes' && o.status === 'sent') {
          doRespond('interested', o, s)
        } else if (intent === 'no' && o.status === 'sent') {
          doRespond('declined', o, s)
        } else if (o.status === 'interested') {
          setPageState('picker')
        } else {
          setPageState('respond')
        }
      })
      .catch(e => {
        setErrMsg(e?.response?.data?.detail || 'Could not load invitation.')
        setPageState('error')
      })
  }, [token]) // eslint-disable-line

  async function doRespond(response, o = outreach, s = slots) {
    setResponding(response === 'interested' ? 'interested' : 'declined')
    try {
      const r = await outreachApi.respond(token, response)
      if (r.data.status === 'interested') {
        setSlots(r.data.slots || s || [])
        setPageState('picker')
      } else {
        setPageState('declined')
      }
    } catch (e) {
      setErrMsg(e?.response?.data?.detail || 'Something went wrong.')
      setPageState('error')
    } finally { setResponding(null) }
  }

  async function doBook(slotId) {
    setBooking(true)
    try {
      const r = await outreachApi.book(token, slotId)
      if (r.data.already_scheduled) {
        setBookResult({
          jobTitle:        outreach?.jobTitle,
          interviewerName: outreach?.interviewerName,
          scheduled_at:    r.data.scheduled_at || outreach?.scheduled_at,
          meeting_link:    r.data.meeting_link  || outreach?.meeting_link,
          duration_mins:   60,
        })
      } else {
        setBookResult(r.data)
      }
      setPageState('confirmed')
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to confirm slot. Please try another.')
    } finally { setBooking(false) }
  }

  if (pageState === 'loading')   return <StepLoading />
  if (pageState === 'error')     return <StepError msg={errMsg} />
  if (pageState === 'declined')  return <StepDeclined outreach={outreach} />
  if (pageState === 'confirmed') return <StepConfirmed result={bookResult} />
  if (pageState === 'picker')    return (
    <StepPicker outreach={outreach} slots={slots} onBook={doBook} booking={booking} />
  )
  return <StepRespond outreach={outreach} onResponse={doRespond} responding={responding} />
}
