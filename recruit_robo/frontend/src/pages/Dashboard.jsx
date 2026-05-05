import { useEffect, useState } from 'react'
import { pipelineApi } from '../api'
import { Users, Briefcase, Calendar, CheckCircle, TrendingUp, User } from 'lucide-react'

const STAT_CONFIG = [
  { key: 'totalCandidates',     label: 'Total Candidates',     icon: Users,        color: 'text-blue-500',   dot: 'bg-blue-500'   },
  { key: 'activeJobs',          label: 'Active Jobs',          icon: Briefcase,    color: 'text-emerald-500', dot: 'bg-emerald-500' },
  { key: 'interviewsScheduled', label: 'Interviews Scheduled', icon: Calendar,     color: 'text-amber-500',  dot: 'bg-amber-500'  },
  { key: 'hiredThisMonth',      label: 'Hired This Month',     icon: CheckCircle,  color: 'text-violet-500', dot: 'bg-violet-500' },
  { key: 'aiMatchRate',         label: 'AI Match Rate',        icon: TrendingUp,   color: 'text-rose-500',   dot: 'bg-rose-500',  suffix: '%' },
]

const ACTIVITY_CONFIG = {
  candidate_added: { Icon: User,        dot: 'bg-blue-500',    label: 'New candidate' },
  job_posted:      { Icon: Briefcase,   dot: 'bg-emerald-500', label: 'Job posted'    },
  candidate_hired: { Icon: CheckCircle, dot: 'bg-violet-500',  label: 'Hired'         },
}

function timeAgo(iso) {
  const diff  = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function StatCard({ config, value, loading }) {
  const { label, icon: Icon, color, suffix } = config
  return (
    <div className="bg-white rounded-xl border border-zinc-200/80 p-5 hover:border-zinc-300 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">{label}</p>
        <Icon className={`w-4 h-4 ${color} opacity-70`} />
      </div>
      <p className="text-3xl font-bold text-zinc-900 tracking-tight">
        {loading ? <span className="text-zinc-300">—</span> : `${value ?? 0}${suffix ?? ''}`}
      </p>
    </div>
  )
}

function ActivityRow({ item }) {
  const cfg = ACTIVITY_CONFIG[item.type] ?? ACTIVITY_CONFIG.candidate_added
  const { Icon, dot } = cfg
  return (
    <div className="flex items-start gap-3 py-3.5 border-b border-zinc-100 last:border-0">
      <div className={`w-2 h-2 rounded-full ${dot} mt-2 flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-800">{item.text}</p>
      </div>
      <span className="text-xs text-zinc-400 flex-shrink-0 mt-0.5">{timeAgo(item.time)}</span>
    </div>
  )
}

export default function Dashboard() {
  const [stats,    setStats]    = useState(null)
  const [activity, setActivity] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.allSettled([
      pipelineApi.dashboard(),
      pipelineApi.recentActivity(),
    ]).then(([statsRes, actRes]) => {
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data)
      else setStats({ totalCandidates: 0, activeJobs: 0, interviewsScheduled: 0, hiredThisMonth: 0, aiMatchRate: 0 })
      if (actRes.status === 'fulfilled') setActivity(actRes.value.data)
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div className="page">

      {/* Page heading */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
        <p className="text-sm text-zinc-400 mt-1">Overview of your recruitment pipeline</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        {STAT_CONFIG.map(cfg => (
          <StatCard key={cfg.key} config={cfg} value={stats?.[cfg.key]} loading={loading} />
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-zinc-200/80">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900">Recent Activity</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Latest events across all jobs</p>
        </div>

        <div className="px-5">
          {loading ? (
            <div className="space-y-0">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-3 py-3.5 border-b border-zinc-100 last:border-0">
                  <div className="w-2 h-2 rounded-full bg-zinc-100 animate-pulse flex-shrink-0" />
                  <div className="flex-1 h-3 bg-zinc-100 rounded animate-pulse" />
                  <div className="w-8 h-3 bg-zinc-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : activity.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-zinc-400">No activity yet.</p>
              <p className="text-xs text-zinc-300 mt-1">Create a job and upload resumes to get started.</p>
            </div>
          ) : (
            <div>
              {activity.map((item, i) => <ActivityRow key={i} item={item} />)}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
