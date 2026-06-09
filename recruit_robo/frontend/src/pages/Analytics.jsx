import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { analyticsApi, jobsApi } from '../api'
import { BarChart2, RefreshCw, Loader2, ChevronDown } from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function Tabs({ options, value, onChange }) {
  return (
    <div className="inline-flex bg-zinc-100 rounded-full p-0.5 gap-0.5">
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)}
          className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
            value === o ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'
          }`}>
          {o}
        </button>
      ))}
    </div>
  )
}

function TimeFilter() {
  return (
    <div className="relative">
      <select className="text-[11px] border border-zinc-200 rounded-md pl-2.5 pr-6 py-1 bg-white text-zinc-600 appearance-none focus:outline-none cursor-pointer">
        <option>Any time</option>
        <option>This week</option>
        <option>This month</option>
        <option>This quarter</option>
      </select>
      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 pointer-events-none" />
    </div>
  )
}

function PanelHeader({ tabs, activeTab, onTab, title }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-200 bg-zinc-50/60">
      {tabs ? (
        <Tabs options={tabs} value={activeTab} onChange={onTab} />
      ) : (
        <span className="text-xs font-semibold text-zinc-700">{title}</span>
      )}
      <TimeFilter />
    </div>
  )
}

function Arrow({ val, goodHigh = true }) {
  if (val == null || val === 0) return null
  const good = goodHigh ? val > 0 : val < 0
  return <span className={`ml-1 font-bold ${good ? 'text-emerald-500' : 'text-red-500'}`}>{good ? '↑' : '↓'}</span>
}

const STAGE_DOT = {
  sourced:    'bg-zinc-400',
  emailed:    'bg-blue-400',
  interested: 'bg-emerald-400',
  scheduled:  'bg-amber-400',
  selected:   'bg-violet-500',
}

// ── Grid Table shared style ───────────────────────────────────────────────────
const TH = 'px-4 py-2.5 text-left text-[11px] font-medium text-zinc-500 bg-zinc-50 border-b border-zinc-200 whitespace-nowrap'
const TH_R = 'px-4 py-2.5 text-right text-[11px] font-medium text-zinc-500 bg-zinc-50 border-b border-zinc-200 whitespace-nowrap border-l border-zinc-100'
const TD = 'px-4 py-2.5 text-xs text-zinc-700 border-b border-zinc-100'
const TD_R = 'px-4 py-2.5 text-xs text-right text-zinc-700 border-b border-zinc-100 border-l border-zinc-100'

// ── Panels ────────────────────────────────────────────────────────────────────

function JobsPanel({ jobStats }) {
  const [tab, setTab] = useState('Job Opening')
  const avg = jobStats?.length
    ? {
        total: (jobStats.reduce((s, j) => s + j.total, 0) / jobStats.length).toFixed(1),
        hired: (jobStats.reduce((s, j) => s + j.hired, 0) / jobStats.length).toFixed(1),
        conv:  (jobStats.reduce((s, j) => s + j.conversion_rate, 0) / jobStats.length).toFixed(1),
        score: (jobStats.reduce((s, j) => s + j.avg_match_score, 0) / jobStats.length).toFixed(1),
      }
    : null

  return (
    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden flex flex-col">
      <PanelHeader tabs={['Job Opening', 'Department']} activeTab={tab} onTab={setTab} />
      <div className="overflow-auto flex-1 max-h-64">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className={TH}>Job Opening</th>
              <th className={TH_R}>Candidates</th>
              <th className={TH_R}>Hired</th>
              <th className={TH_R}>Conv %</th>
              <th className={TH_R}>Avg Match</th>
            </tr>
          </thead>
          <tbody>
            {avg && (
              <tr className="bg-zinc-50/50 hover:bg-zinc-50 transition-colors">
                <td className={TD}><span className="font-medium text-zinc-600">All Jobs (Avg.)</span></td>
                <td className={TD_R}>{avg.total}</td>
                <td className={TD_R}>{avg.hired}</td>
                <td className={TD_R}><span className="font-medium">{avg.conv}%</span></td>
                <td className={TD_R}>{avg.score}%</td>
              </tr>
            )}
            {(jobStats || []).map(j => (
              <tr key={j.jobId} className="hover:bg-zinc-50 transition-colors">
                <td className={TD}>
                  <Link to={`/jobs/${j.jobId}`} className="text-blue-600 hover:underline font-medium truncate max-w-[180px] block">
                    {j.title}
                  </Link>
                </td>
                <td className={TD_R}>
                  {j.total}
                  <Arrow val={j.total - (avg?.total || 0)} goodHigh={true} />
                </td>
                <td className={`${TD_R} font-medium ${j.hired > 0 ? 'text-emerald-600' : 'text-zinc-400'}`}>{j.hired}</td>
                <td className={TD_R}>
                  <span className={j.conversion_rate >= 20 ? 'text-emerald-600 font-medium' : j.conversion_rate >= 10 ? 'text-amber-600 font-medium' : 'text-zinc-400'}>
                    {j.conversion_rate}%
                  </span>
                  <Arrow val={j.conversion_rate - parseFloat(avg?.conv || 0)} goodHigh={true} />
                </td>
                <td className={TD_R}>{j.avg_match_score}%</td>
              </tr>
            ))}
            {!jobStats?.length && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-xs text-zinc-400">No jobs yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CandidatePanel({ overview }) {
  const [tab, setTab] = useState('Candidate')
  const sources = overview?.sources || {}
  const sourceEntries = Object.entries(sources).sort((a, b) => b[1] - a[1])
  const totalSrc = sourceEntries.reduce((s, [, c]) => s + c, 0)
  const avgTTH = overview?.avg_time_to_hire

  return (
    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden flex flex-col">
      <PanelHeader tabs={['Candidate', 'Department']} activeTab={tab} onTab={setTab} />
      <div className="overflow-auto flex-1 max-h-64">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className={TH}>Source</th>
              <th className={TH_R}>Candidates</th>
              <th className={TH_R}>Share %</th>
              <th className={TH_R}>Time-to-hire [days]</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-zinc-50/50 hover:bg-zinc-50 transition-colors">
              <td className={TD}><span className="font-medium text-zinc-600">All Candidates (Avg.)</span></td>
              <td className={TD_R}>{overview?.total_candidates ?? '—'}</td>
              <td className={TD_R}>100%</td>
              <td className={TD_R}>{avgTTH != null ? avgTTH : '—'}</td>
            </tr>
            {sourceEntries.map(([src, cnt]) => {
              const pct = totalSrc ? Math.round(cnt / totalSrc * 100) : 0
              return (
                <tr key={src} className="hover:bg-zinc-50 transition-colors">
                  <td className={TD}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${src === 'Portal' ? 'bg-blue-400' : src === 'Upload' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                      {src}
                    </div>
                  </td>
                  <td className={TD_R}>{cnt}</td>
                  <td className={TD_R}>
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-blue-400" style={{ width: `${pct}%` }} />
                      </div>
                      {pct}%
                    </div>
                  </td>
                  <td className={TD_R + ' text-zinc-400'}>—</td>
                </tr>
              )
            })}
            {!sourceEntries.length && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-xs text-zinc-400">No data yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FunnelPanel({ jobs, selectedJob, setSelectedJob, funnel, funnelLoading }) {
  const [tab, setTab] = useState('Job Opening')

  return (
    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-200 bg-zinc-50/60 gap-2 flex-wrap">
        <Tabs options={['Job Opening', 'Stage']} value={tab} onChange={setTab} />
        <div className="flex items-center gap-2">
          <div className="relative">
            <select value={selectedJob} onChange={e => setSelectedJob(e.target.value)}
              className="text-[11px] border border-zinc-200 rounded-md pl-2.5 pr-6 py-1 bg-white text-zinc-600 appearance-none focus:outline-none max-w-[160px] truncate cursor-pointer">
              {jobs.map(j => <option key={j.jobId} value={j.jobId}>{j.title}</option>)}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 pointer-events-none" />
          </div>
          <TimeFilter />
        </div>
      </div>
      <div className="overflow-auto flex-1 max-h-64">
        {funnelLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-zinc-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /><span className="text-xs">Loading…</span>
          </div>
        ) : (
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className={TH}>Stage</th>
                <th className={TH_R}>Count</th>
                <th className={TH_R}>% of Total</th>
                <th className={TH_R}>Conv. Rate</th>
                <th className={TH_R}>Avg Score</th>
              </tr>
            </thead>
            <tbody>
              {funnel?.funnel?.map(s => (
                <tr key={s.stage} className="hover:bg-zinc-50 transition-colors">
                  <td className={TD}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STAGE_DOT[s.stage] || 'bg-zinc-300'}`} />
                      <span className="capitalize">{s.stage.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className={TD_R}><span className="font-semibold text-zinc-800">{s.count}</span></td>
                  <td className={TD_R}>{s.pct_of_total?.toFixed(1)}%</td>
                  <td className={TD_R}>
                    {s.conversion_from_prev != null
                      ? <span className={s.conversion_from_prev >= 70 ? 'text-emerald-600 font-medium' : s.conversion_from_prev >= 40 ? 'text-amber-600' : 'text-red-500'}>
                          {s.conversion_from_prev?.toFixed(1)}%
                        </span>
                      : '—'}
                  </td>
                  <td className={TD_R}>{s.avg_score != null ? `${s.avg_score}%` : '—'}</td>
                </tr>
              ))}
              {!funnel?.funnel?.length && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-xs text-zinc-400">Select a job to view funnel</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      {funnel && (
        <div className="flex gap-4 px-4 py-2 border-t border-zinc-100 bg-zinc-50/50 text-[11px] text-zinc-500">
          <span>Total <strong className="text-zinc-700">{funnel.total}</strong></span>
          <span>Hired <strong className="text-emerald-600">{funnel.hired}</strong></span>
          <span>Rejected <strong className="text-red-500">{funnel.rejected}</strong></span>
          {funnel.avg_time_to_hire && <span>Avg hire <strong className="text-amber-600">{funnel.avg_time_to_hire}d</strong></span>}
        </div>
      )}
    </div>
  )
}

function HiringPanel({ overview }) {
  const hired    = overview?.total_hired    ?? 0
  const rejected = overview?.total_rejected ?? 0
  const total    = overview?.total_candidates ?? 0
  const active   = overview?.active_jobs ?? 0
  const hireRate = total ? ((hired / total) * 100).toFixed(1) : 0
  const rejRate  = total ? ((rejected / total) * 100).toFixed(1) : 0

  const rows = [
    { label: 'Total Candidates', value: total,   trend: null },
    { label: 'Selected / Hired',  value: hired,   pct: `${hireRate}%`,  color: 'text-emerald-600' },
    { label: 'Rejected',          value: rejected, pct: `${rejRate}%`,   color: 'text-red-500' },
    { label: 'Active Jobs',       value: active,  trend: null },
    { label: 'Avg Time-to-Hire',  value: overview?.avg_time_to_hire != null ? `${overview.avg_time_to_hire}d` : '—', color: 'text-amber-600' },
    { label: 'Hire Rate',         value: `${hireRate}%`, color: hireRate >= 20 ? 'text-emerald-600' : 'text-amber-600' },
  ]

  return (
    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden flex flex-col">
      <PanelHeader title="Hiring Summary" tabs={['Overview', 'By Job']} activeTab="Overview" onTab={() => {}} />
      <div className="overflow-auto flex-1 max-h-64">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className={TH}>Metric</th>
              <th className={TH_R}>Value</th>
              <th className={TH_R}>% Share</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.label} className="hover:bg-zinc-50 transition-colors">
                <td className={TD}>{r.label}</td>
                <td className={`${TD_R} font-semibold ${r.color || 'text-zinc-800'}`}>{r.value}</td>
                <td className={TD_R + ' text-zinc-400'}>{r.pct ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Analytics() {
  const [overview, setOverview]           = useState(null)
  const [jobs, setJobs]                   = useState([])
  const [selectedJob, setSelectedJob]     = useState('')
  const [funnel, setFunnel]               = useState(null)
  const [funnelLoading, setFunnelLoading] = useState(false)
  const [loading, setLoading]             = useState(true)

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
      .then(([ov, jl]) => { setOverview(ov.data); setJobs(jl.data || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  if (loading) return (
    <div className="page flex items-center justify-center h-64 gap-2 text-zinc-400">
      <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading analytics…</span>
    </div>
  )

  return (
    <div className="page">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-blue-500" />
          <h1 className="text-lg font-bold text-zinc-900">Analytics</h1>
          <span className="text-xs text-zinc-400 ml-1">Recruitment insights</span>
        </div>
        <button onClick={refresh}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-500 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Candidates', value: overview?.total_candidates ?? '—', color: 'text-zinc-900' },
          { label: 'Selected',         value: overview?.total_hired      ?? '—', color: 'text-emerald-600' },
          { label: 'Rejected',         value: overview?.total_rejected   ?? '—', color: 'text-red-500' },
          { label: 'Avg Time-to-Hire', value: overview?.avg_time_to_hire != null ? `${overview.avg_time_to_hire}d` : '—', color: 'text-amber-600' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-zinc-200 rounded-xl px-4 py-3">
            <p className="text-[11px] text-zinc-400 mb-0.5">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* 2×2 grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <JobsPanel     jobStats={overview?.job_stats} />
        <CandidatePanel overview={overview} />
        <FunnelPanel
          jobs={jobs}
          selectedJob={selectedJob}
          setSelectedJob={setSelectedJob}
          funnel={funnel}
          funnelLoading={funnelLoading}
        />
        <HiringPanel overview={overview} />
      </div>

    </div>
  )
}
