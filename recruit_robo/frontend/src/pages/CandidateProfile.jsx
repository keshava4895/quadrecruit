import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { candidatesApi } from '../api'
import {
  ChevronLeft, Mail, Phone, Briefcase, MapPin, Star,
  FileText, MessageSquare, Calendar, CheckCircle, XCircle,
  Clock, ChevronDown, ChevronUp, Loader2, Download,
} from 'lucide-react'

const STATUS_STYLE = {
  sourced:     'bg-zinc-100 text-zinc-600',
  emailed:     'bg-blue-50 text-blue-700',
  interested:  'bg-emerald-50 text-emerald-700',
  scheduled:   'bg-amber-50 text-amber-700',
  selected:    'bg-violet-50 text-violet-700',
  rejected:    'bg-red-50 text-red-600',
  no_response: 'bg-zinc-100 text-zinc-400',
}

const DECISION_ICON = {
  Selected:   <CheckCircle className="w-4 h-4 text-emerald-500" />,
  Rejected:   <XCircle className="w-4 h-4 text-red-400" />,
  'Next Round': <ChevronUp className="w-4 h-4 text-blue-500" />,
}

function ScoreRing({ score }) {
  const pct   = Math.round((score || 0) * 100)
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444'
  const r = 28, circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <div className="relative w-20 h-20 flex-shrink-0">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#f4f4f5" strokeWidth="6" />
        <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-zinc-900">{pct}%</span>
        <span className="text-[9px] text-zinc-400 leading-none">match</span>
      </div>
    </div>
  )
}

function Section({ title, icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-50 transition-colors">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
          {icon}
          {title}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  )
}

export default function CandidateProfile() {
  const { candidateId } = useParams()
  const navigate                       = useNavigate()
  const [profile, setProfile]         = useState(null)
  const [loading, setLoading]         = useState(true)
  const [dlLoading, setDlLoading]     = useState(false)

  useEffect(() => {
    candidatesApi.fullProfile(candidateId)
      .then(r => setProfile(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [candidateId])

  async function downloadResume() {
    setDlLoading(true)
    try {
      const r = await candidatesApi.resumeUrl(candidateId)
      window.open(r.data.url, '_blank')
    } catch {
      alert('Resume file not available.')
    } finally {
      setDlLoading(false)
    }
  }

  if (loading) return (
    <div className="page flex items-center justify-center h-64 gap-2 text-zinc-400">
      <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading profile…</span>
    </div>
  )
  if (!profile) return (
    <div className="page text-sm text-red-500">Candidate not found.</div>
  )

  const bestScore = Math.max(...(profile.jobs || []).map(j => j.match_score || 0), 0)
  const bestJob   = profile.jobs?.find(j => j.match_score === bestScore)

  return (
    <div className="page max-w-4xl">

      {/* Back */}
      <button onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 mb-4 transition-colors">
        <ChevronLeft className="w-3.5 h-3.5" /> Back
      </button>

      {/* Header card */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 mb-4 flex items-start gap-5">
        <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
          {profile.name?.charAt(0)?.toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-zinc-900">{profile.name}</h1>
                {profile.resume_blob && (
                  <button onClick={downloadResume} disabled={dlLoading}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-zinc-900 hover:bg-zinc-700 text-white rounded-lg transition-colors disabled:opacity-50">
                    {dlLoading
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Download className="w-3.5 h-3.5" />}
                    Download Resume
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-zinc-400">
                {profile.email && (
                  <a href={`mailto:${profile.email}`} className="flex items-center gap-1 hover:text-zinc-700 transition-colors">
                    <Mail className="w-3.5 h-3.5" />{profile.email}
                  </a>
                )}
                {profile.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />{profile.phone}
                  </span>
                )}
                {profile.experience > 0 && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5" />{profile.experience} yrs experience
                  </span>
                )}
              </div>
            </div>
            {bestJob && (
              <div className="flex items-center gap-3">
                <ScoreRing score={bestScore} />
                <div>
                  <p className="text-xs text-zinc-400">Best match</p>
                  <p className="text-sm font-medium text-zinc-700 max-w-[140px] truncate">{bestJob.title}</p>
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
                <span key={s} className="px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-full text-xs">{s}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">

        {/* Summary */}
        {profile.summary && (
          <Section title="Summary" icon={<Star className="w-4 h-4 text-amber-400" />}>
            <p className="text-sm text-zinc-600 leading-relaxed">{profile.summary}</p>
          </Section>
        )}

        {/* Jobs & Scores */}
        {profile.jobs?.length > 0 && (
          <Section title="Job Applications" icon={<Briefcase className="w-4 h-4 text-blue-500" />}>
            <div className="space-y-2">
              {profile.jobs.map(j => {
                const pct = Math.round((j.match_score || 0) * 100)
                const bar = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-400' : 'bg-red-400'
                return (
                  <div key={j.jobId} className="flex items-center gap-4 py-2.5 border-b border-zinc-50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Link to={`/jobs/${j.jobId}`} className="text-sm font-medium text-zinc-900 hover:text-blue-600 transition-colors truncate">
                          {j.title}
                        </Link>
                        {j.location && <span className="flex items-center gap-0.5 text-xs text-zinc-400 flex-shrink-0"><MapPin className="w-3 h-3" />{j.location}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden max-w-[120px]">
                          <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-zinc-700">{pct}%</span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_STYLE[j.status] || STATUS_STYLE.sourced}`}>
                      {j.status?.replace('_', ' ')}
                    </span>
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
                <div key={i} className="border border-zinc-100 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {DECISION_ICON[fb.decision]}
                      <span className="text-sm font-medium text-zinc-900">Round {fb.round}</span>
                      {fb.interviewer_name && (
                        <span className="text-xs text-zinc-400">by {fb.interviewer_name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400">Rating</span>
                      <span className="text-sm font-bold text-zinc-900">{fb.rating}/10</span>
                    </div>
                  </div>
                  {fb.comments && (
                    <p className="text-sm text-zinc-600 leading-relaxed">{fb.comments}</p>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Upcoming / Past Interviews */}
        {profile.assignments?.length > 0 && (
          <Section title="Interview Schedule" icon={<Calendar className="w-4 h-4 text-amber-500" />}>
            <div className="space-y-2">
              {profile.assignments.map((a, i) => {
                const isPast = a.scheduledDate && a.scheduledDate < new Date().toISOString()
                return (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-zinc-50 last:border-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isPast ? 'bg-zinc-300' : 'bg-amber-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate">{a.jobTitle}</p>
                      <p className="text-xs text-zinc-400">Round {a.round} · with {a.interviewer_name || a.interviewer_email}</p>
                    </div>
                    {a.scheduledDate && (
                      <span className="text-xs text-zinc-500 flex-shrink-0 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(a.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${isPast ? 'bg-zinc-100 text-zinc-400' : 'bg-amber-50 text-amber-700'}`}>
                      {isPast ? 'Past' : 'Upcoming'}
                    </span>
                  </div>
                )
              })}
            </div>
          </Section>
        )}

        {/* Resume */}
        {profile.resume_text && (
          <Section title="Resume Text" icon={<FileText className="w-4 h-4 text-zinc-500" />} defaultOpen={false}>
            <pre className="text-xs text-zinc-600 whitespace-pre-wrap font-mono leading-relaxed bg-zinc-50 rounded-lg p-4 max-h-96 overflow-y-auto border border-zinc-100">
              {profile.resume_text}
            </pre>
          </Section>
        )}

      </div>
    </div>
  )
}
