import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { pipelineApi } from '../api'
import { useAuth } from '../context/AuthContext'
import {
  Users, Briefcase, Calendar, CheckCircle, TrendingUp,
  ArrowRight, Sparkles, UserCheck, Clock, Star,
} from 'lucide-react'

// Brand purple: #49029F
const BRAND = '#49029F'

function timeAgo(iso) {
  const diff  = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}


export default function Dashboard() {
  const { user }                    = useAuth()
  const [stats,    setStats]        = useState(null)
  const [activity, setActivity]     = useState([])
  const [loading,  setLoading]      = useState(true)

  const firstName = user?.name?.split(' ')[0] || 'there'
  const avatar    = user?.name?.charAt(0)?.toUpperCase() || 'Q'
  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    Promise.allSettled([
      pipelineApi.dashboard(),
      pipelineApi.recentActivity(),
    ]).then(([statsRes, actRes]) => {
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data)
      else setStats({ totalCandidates: 0, activeJobs: 0, interviewsScheduled: 0, hiredThisMonth: 0, aiMatchRate: 0 })
      if (actRes.status === 'fulfilled') setActivity(actRes.value.data?.slice(0, 6) || [])
    }).finally(() => setLoading(false))
  }, [])

  const kpis = [
    { label: 'Total Candidates',     value: stats?.totalCandidates     ?? 0, icon: Users,        dark: true  },
    { label: 'Active Jobs',          value: stats?.activeJobs          ?? 0, icon: Briefcase,    dark: false },
    { label: 'Interviews Scheduled', value: stats?.interviewsScheduled ?? 0, icon: Calendar,     dark: false },
    { label: 'Hired This Month',     value: stats?.hiredThisMonth      ?? 0, icon: CheckCircle,  dark: false },
  ]

  const tasks = [
    {
      category: 'Candidates',
      title: 'Review new applications',
      desc: 'Screen and shortlist incoming resumes',
      to: '/candidates',
      icon: Users,
      color: 'from-violet-500 to-purple-600',
    },
    {
      category: 'Pipeline',
      title: 'Check interview schedule',
      desc: 'View upcoming and pending interviews',
      to: '/pipeline',
      icon: Calendar,
      color: 'from-blue-500 to-indigo-600',
    },
    {
      category: 'Jobs',
      title: 'Post a new job',
      desc: 'Create and publish an open position',
      to: '/jobs',
      icon: Briefcase,
      color: 'from-emerald-500 to-teal-600',
    },
  ]

  return (
    <div className="px-6 py-5 w-full space-y-5">

      {/* ── Welcome Banner ─────────────────────────────────────────────────── */}
      <div
        className="relative rounded-2xl overflow-hidden p-6 md:p-8"
        style={{ background: 'linear-gradient(135deg, #49029F 0%, #7c3aed 55%, #a855f7 100%)' }}
      >
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)', transform: 'translate(-50%, 40%)' }} />

        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-2xl font-bold border border-white/30 flex-shrink-0">
              {avatar}
            </div>
            <div>
              <p className="text-white/70 text-sm font-medium">{greeting},</p>
              <h1 className="text-white text-2xl font-bold tracking-tight">{firstName}!</h1>
              <p className="text-white/60 text-sm mt-0.5">Here's what's happening with your recruitment today.</p>
            </div>
          </div>

          {/* AI badge */}
          <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2.5">
            <Sparkles className="w-4 h-4 text-yellow-300" />
            <div>
              <p className="text-white text-xs font-semibold">AI Match Rate</p>
              <p className="text-white/70 text-xs">
                {loading ? '—' : `${stats?.aiMatchRate ?? 0}% accuracy`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <div key={k.label}
            className={`rounded-2xl p-5 flex items-center gap-4 shadow-sm transition-transform hover:-translate-y-0.5 ${
              i === 0
                ? 'text-white'
                : 'bg-white border border-gray-100'
            }`}
            style={i === 0 ? { background: 'linear-gradient(135deg, #49029F, #7c3aed)' } : {}}
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
              i === 0 ? 'bg-white/20' : 'bg-purple-50'
            }`}>
              <k.icon className={`w-5 h-5 ${i === 0 ? 'text-white' : 'text-purple-600'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${i === 0 ? 'text-white' : 'text-gray-900'}`}>
                {loading ? '—' : k.value}
              </p>
              <p className={`text-xs font-medium mt-0.5 ${i === 0 ? 'text-white/70' : 'text-gray-400'}`}>
                {k.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Two-column: Tasks + Activity ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Today's Tasks */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Today's Tasks</h2>
            <span className="text-xs text-gray-400">Get started</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {tasks.map(t => (
              <div key={t.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                {/* Gradient header */}
                <div className={`bg-gradient-to-br ${t.color} p-5 flex items-center justify-center`}>
                  <div className="w-12 h-12 rounded-xl bg-white/25 flex items-center justify-center">
                    <t.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{t.category}</p>
                  <p className="text-sm font-semibold text-gray-900 leading-tight mb-1">{t.title}</p>
                  <p className="text-xs text-gray-400 mb-4 leading-relaxed">{t.desc}</p>
                  <Link to={t.to}
                    className="flex items-center gap-1 text-xs font-semibold"
                    style={{ color: BRAND }}>
                    START NOW <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Recent Activity</h2>
            <Clock className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-7 h-7 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 bg-gray-100 rounded animate-pulse w-3/4" />
                    <div className="h-2 bg-gray-100 rounded animate-pulse w-1/3" />
                  </div>
                </div>
              ))
            ) : activity.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Star className="w-7 h-7 text-gray-200 mx-auto mb-2" />
                <p className="text-xs text-gray-400">No activity yet</p>
              </div>
            ) : (
              activity.map((item, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
                    <CheckCircle className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 leading-snug">{item.text}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(item.time)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
