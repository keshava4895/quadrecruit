import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { analyticsApi, jobsApi } from '../api'
import {
  BarChart2, Users, CheckCircle, XCircle, Briefcase, Clock,
  TrendingUp, Loader2, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react'

const STAGE_COLOR = {
  sourced:    { bar: 'bg-zinc-400',    text: 'text-zinc-500'    },
  emailed:    { bar: 'bg-blue-400',    text: 'text-blue-600'    },
  interested: { bar: 'bg-emerald-400', text: 'text-emerald-600' },
  scheduled:  { bar: 'bg-amber-400',   text: 'text-amber-600'   },
  selected:   { bar: 'bg-violet-500',  text: 'text-violet-600'  },
}

function KpiCard({ icon, label, value, sub, color = 'text-zinc-900' }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5 flex items-start gap-4">
      <div className="p-2.5 bg-zinc-50 rounded-xl flex-shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-zinc-400 mb-0.5">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}</p>
        {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function FunnelBar({ stage, count, pctOfTotal, convFromPrev, avgScore }) {
  const cfg = STAGE_COLOR[stage] || STAGE_COLOR.sourced
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-zinc-50 last:border-0">
      <div className="w-24 flex-shrink-0">
        <span className={`text-xs font-medium capitalize ${cfg.text}`}>{stage.replace('_', ' ')}</span>
      </div>
      <div className="flex-1 flex items-center gap-2">
        <div className="flex-1 h-5 bg-zinc-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${cfg.bar}`}
            style={{ width: `${Math.max(pctOfTotal || 0, 1)}%` }} />
        </div>
        <span className="text-sm font-semibold text-zinc-800 w-8 text-right">{count}</span>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0 text-xs text-zinc-400">
        <span className="w-16 text-right">{pctOfTotal?.toFixed(1)}% of total</span>
        {convFromPrev != null && convFromPrev < 100 && (
          <span className="w-20 text-right text-amber-600">{convFromPrev?.toFixed(1)}% converted</span>
        )}
        {avgScore != null && (
          <span className="w-20 text-right text-zinc-400">avg {avgScore}% match</span>
        )}
      </div>
    </div>
  )
}

function SourcePie({ sources }) {
  if (!sources || !Object.keys(sources).length) return <p className="text-xs text-zinc-400">No data</p>
  const total  = Object.values(sources).reduce((a, b) => a + b, 0)
  const colors = ['bg-blue-400', 'bg-emerald-400', 'bg-amber-400', 'bg-violet-400', 'bg-zinc-300']
  const entries = Object.entries(sources).sort((a, b) => b[1] - a[1])
  return (
    <div className="space-y-2 mt-2">
      {entries.map(([src, cnt], i) => {
        const pct = total ? Math.round(cnt / total * 100) : 0
        return (
          <div key={src} className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colors[i % colors.length]}`} />
            <span className="text-xs text-zinc-600 flex-1">{src}</span>
            <div className="flex items-center gap-1.5">
              <div className="w-20 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${colors[i % colors.length]}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs font-semibold text-zinc-700 w-8 text-right">{cnt}</span>
              <span className="text-[10px] text-zinc-400 w-8 text-right">{pct}%</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Analytics() {
  const [overview, setOverview]         = useState(null)
  const [jobs, setJobs]                 = useState([])
  const [selectedJob, setSelectedJob]   = useState('')
  const [funnel, setFunnel]             = useState(null)
  const [funnelLoading, setFunnelLoading] = useState(false)
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    Promise.all([analyticsApi.overview(), jobsApi.list()])
      .then(([ov, jl]) => {
        setOverview(ov.data)
        const sorted = (jl.data || []).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
        setJobs(sorted)
        if (sorted.length) setSelectedJob(sorted[0].jobId)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedJob) return
    setFunnelLoading(true)
    analyticsApi.funnel(selectedJob)
      .then(r => setFunnel(r.data))
      .catch(() => setFunnel(null))
      .finally(() => setFunnelLoading(false))
  }, [selectedJob])

  function refresh() {
    setLoading(true)
    Promise.all([analyticsApi.overview(), jobsApi.list()])
      .then(([ov, jl]) => {
        setOverview(ov.data)
        setJobs(jl.data || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  if (loading) return (
    <div className="page flex items-center justify-center h-64 gap-2 text-zinc-400">
      <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading analytics…</span>
    </div>
  )

  return (
    <div className="page max-w-5xl">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-blue-500" /> Analytics
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">Recruitment funnel, source breakdown, and hiring metrics</p>
        </div>
        <button onClick={refresh}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-500 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard
          icon={<Users className="w-4 h-4 text-zinc-500" />}
          label="Total Candidates"
          value={overview?.total_candidates}
        />
        <KpiCard
          icon={<CheckCircle className="w-4 h-4 text-emerald-500" />}
          label="Selected"
          value={overview?.total_hired}
          color="text-emerald-600"
          sub={overview?.total_candidates ? `${(overview.total_hired / overview.total_candidates * 100).toFixed(1)}% hire rate` : undefined}
        />
        <KpiCard
          icon={<XCircle className="w-4 h-4 text-red-400" />}
          label="Rejected"
          value={overview?.total_rejected}
          color="text-red-500"
        />
        <KpiCard
          icon={<Clock className="w-4 h-4 text-amber-500" />}
          label="Avg Time to Hire"
          value={overview?.avg_time_to_hire != null ? `${overview.avg_time_to_hire}d` : '—'}
          color="text-amber-600"
          sub="from sourced to selected"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

        {/* Source breakdown */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-900 mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" /> Source Breakdown
          </h2>
          <p className="text-xs text-zinc-400 mb-2">Where candidates came from</p>
          <SourcePie sources={overview?.sources} />
        </div>

        {/* Per-job table */}
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-violet-500" /> Jobs Overview
          </h2>
          {overview?.job_stats?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-100">
                    <th className="text-left py-2 text-zinc-400 font-medium">Job</th>
                    <th className="text-right py-2 text-zinc-400 font-medium">Total</th>
                    <th className="text-right py-2 text-zinc-400 font-medium">Hired</th>
                    <th className="text-right py-2 text-zinc-400 font-medium">Conv%</th>
                    <th className="text-right py-2 text-zinc-400 font-medium">Avg Match</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.job_stats.map(j => (
                    <tr key={j.jobId} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50 transition-colors">
                      <td className="py-2.5 pr-3">
                        <Link to={`/jobs/${j.jobId}`} className="font-medium text-zinc-900 hover:text-blue-600 transition-colors truncate max-w-[200px] block">
                          {j.title}
                        </Link>
                      </td>
                      <td className="py-2.5 text-right text-zinc-700">{j.total}</td>
                      <td className="py-2.5 text-right text-emerald-600 font-medium">{j.hired}</td>
                      <td className="py-2.5 text-right">
                        <span className={`font-medium ${j.conversion_rate >= 20 ? 'text-emerald-600' : j.conversion_rate >= 10 ? 'text-amber-600' : 'text-zinc-400'}`}>
                          {j.conversion_rate}%
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-zinc-500">{j.avg_match_score}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-zinc-400 py-4 text-center">No job data yet</p>
          )}
        </div>
      </div>

      {/* Funnel per job */}
      <div className="bg-white border border-zinc-200 rounded-xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-amber-500" /> Pipeline Funnel
          </h2>
          <select
            value={selectedJob}
            onChange={e => setSelectedJob(e.target.value)}
            className="text-xs border border-zinc-200 rounded-lg px-3 py-1.5 bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[240px]">
            {jobs.map(j => (
              <option key={j.jobId} value={j.jobId}>{j.title}</option>
            ))}
          </select>
        </div>

        {funnelLoading ? (
          <div className="flex items-center gap-2 py-6 text-zinc-400 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /><span className="text-xs">Loading…</span>
          </div>
        ) : funnel ? (
          <>
            <div className="flex gap-6 mb-4 text-xs text-zinc-500 flex-wrap">
              <span>Total: <strong className="text-zinc-800">{funnel.total}</strong></span>
              <span>Hired: <strong className="text-emerald-600">{funnel.hired}</strong></span>
              <span>Rejected: <strong className="text-red-500">{funnel.rejected}</strong></span>
              {funnel.avg_time_to_hire && (
                <span>Avg time to hire: <strong className="text-amber-600">{funnel.avg_time_to_hire}d</strong></span>
              )}
            </div>
            <div>
              {funnel.funnel?.map(stage => (
                <FunnelBar
                  key={stage.stage}
                  stage={stage.stage}
                  count={stage.count}
                  pctOfTotal={stage.pct_of_total}
                  convFromPrev={stage.conversion_from_prev}
                  avgScore={stage.avg_score}
                />
              ))}
            </div>
            {funnel.total === 0 && (
              <p className="text-xs text-zinc-400 text-center py-4">No candidates for this job yet.</p>
            )}
          </>
        ) : (
          <p className="text-xs text-zinc-400 text-center py-4">Select a job to view its funnel.</p>
        )}
      </div>

    </div>
  )
}
