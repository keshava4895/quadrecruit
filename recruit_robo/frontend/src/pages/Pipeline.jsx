import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { jobsApi, candidatesApi, pipelineApi, analyticsApi } from '../api'
import {
  Loader2, RefreshCw, ChevronDown, Zap, ArrowRight, X,
  Eye, Maximize2, LayoutList, Columns,
} from 'lucide-react'

// ── Pipeline table stage config ───────────────────────────────────────────────
const STAGES = [
  { key: 'sourced',     label: 'Screening',   bg: '#94a3b8', fg: '#0f172a', grad: '#94a3b8' },
  { key: 'emailed',     label: 'Submissions',  bg: '#93c5fd', fg: '#1e3a5f', grad: '#93c5fd' },
  { key: 'interested',  label: 'Interview',    bg: '#fdba74', fg: '#7c2d12', grad: '#fdba74' },
  { key: 'scheduled',   label: 'Shortlisted',  bg: '#fde047', fg: '#713f12', grad: '#fde047' },
  { key: 'selected',    label: 'Hired',        bg: '#5eead4', fg: '#134e4a', grad: '#5eead4' },
  { key: 'rejected',    label: 'Rejected',     bg: '#fca5a5', fg: '#7f1d1d', grad: '#fca5a5' },
  { key: 'no_response', label: 'Archived',     bg: '#bae6fd', fg: '#0c4a6e', grad: '#bae6fd' },
]

// ── Board config ──────────────────────────────────────────────────────────────
const BOARD_GROUPS = [
  { key: 'new',      label: 'New',      stages: ['sourced'] },
  { key: 'active',   label: 'Active',   stages: ['emailed', 'interested', 'scheduled'] },
  { key: 'hired',    label: 'Hired',    stages: ['selected'] },
  { key: 'rejected', label: 'Rejected', stages: ['rejected'] },
  { key: 'other',    label: 'Other',    stages: ['no_response'] },
]

const STAGE_LABELS = {
  sourced:     'Sourced',
  emailed:     'Emailed',
  interested:  'Interested',
  scheduled:   'Interview',
  selected:    'Hired',
  rejected:    'Rejected',
  no_response: 'No Response',
}

const STAGE_BADGE = {
  sourced:     'bg-zinc-100 text-zinc-600',
  emailed:     'bg-blue-50 text-blue-700',
  interested:  'bg-emerald-50 text-emerald-700',
  scheduled:   'bg-amber-50 text-amber-700',
  selected:    'bg-teal-50 text-teal-700',
  rejected:    'bg-red-50 text-red-600',
  no_response: 'bg-sky-50 text-sky-700',
}

const ALL_STATUSES = ['sourced','emailed','interested','scheduled','selected','rejected','no_response']

// ── Score badge ───────────────────────────────────────────────────────────────
function ScoreBadge({ score }) {
  const pct   = Math.round((score || 0) * 100)
  const ring  = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : pct > 0 ? '#ef4444' : '#d4d4d8'
  const color = pct >= 80 ? '#065f46' : pct >= 60 ? '#92400e' : pct > 0 ? '#7f1d1d' : '#71717a'
  return (
    <div style={{ borderColor: ring, color }}
      className="w-9 h-9 rounded-full border-2 flex items-center justify-center text-[11px] font-bold flex-shrink-0 bg-white">
      {pct > 0 ? pct : '—'}
    </div>
  )
}

// ── Chevron badge (pipeline table) ────────────────────────────────────────────
function Chevron({ count, bg, fg }) {
  if (!count) return null
  return (
    <div className="flex items-center justify-start px-2">
      <div
        style={{
          background: bg, color: fg,
          clipPath: 'polygon(0% 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 0% 100%)',
          minWidth: 44,
        }}
        className="inline-flex items-center justify-center h-[26px] pl-3 pr-5 text-xs font-bold select-none">
        {count}
      </div>
    </div>
  )
}

// ── Pipeline Table View ───────────────────────────────────────────────────────
function PipelineTable({ rows, loading, onRefresh }) {
  const gradientBar = STAGES.map(s => s.grad).join(', ')

  return (
    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-200 bg-zinc-50/60">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-700">Pipeline View</span>
          <Maximize2 className="w-3 h-3 text-zinc-400" />
        </div>
        <button onClick={onRefresh}
          className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-600 transition-colors">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      <div className="h-[3px]" style={{ background: `linear-gradient(to right, ${gradientBar})` }} />

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-zinc-400">
          <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading pipeline…</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 text-sm">No jobs found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="border-collapse" style={{ minWidth: 900, width: '100%' }}>
            <thead>
              <tr>
                <th className="sticky left-0 z-10 px-3 py-2 text-left text-[11px] font-medium text-zinc-500 bg-zinc-50 border-b border-zinc-200 whitespace-nowrap"
                  style={{ minWidth: 240, width: 240 }}>
                  Posting Title / Department
                  <span className="ml-1 text-zinc-300">⇅</span>
                </th>
                {STAGES.map(s => (
                  <th key={s.key}
                    className="px-3 py-2 text-[11px] font-medium text-zinc-500 bg-zinc-50 border-b border-zinc-200 border-l border-zinc-100 whitespace-nowrap text-center"
                    style={{ minWidth: 100 }}>
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.jobId} className="hover:bg-zinc-50/80 transition-colors group">
                  <td className="sticky left-0 z-10 px-3 py-2 border-b border-zinc-100 bg-white group-hover:bg-zinc-50/80 transition-colors"
                    style={{ minWidth: 240, width: 240 }}>
                    <div className="flex items-start gap-2">
                      <Eye className="w-3.5 h-3.5 text-zinc-300 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <Link to={`/jobs/${row.jobId}`}
                          className="text-xs font-medium text-blue-600 hover:underline leading-tight truncate block max-w-[180px]">
                          {row.title}
                          <span className="text-zinc-400 font-normal ml-1">({row.total})</span>
                        </Link>
                        <p className="text-[10px] text-zinc-400 leading-tight mt-0.5">
                          {row.department || 'General'} · {row.jobId}
                        </p>
                      </div>
                    </div>
                  </td>
                  {STAGES.map(s => (
                    <td key={s.key}
                      className="px-1 py-2 border-b border-zinc-100 border-l border-zinc-100"
                      style={{ minWidth: 100 }}>
                      <Chevron count={row.counts[s.key] || 0} bg={s.bg} fg={s.fg} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Auto-advance Modal ────────────────────────────────────────────────────────
function AutoAdvanceModal({ suggestions, onClose, onConfirm, applying }) {
  const actionable = suggestions.filter(s => s.suggestion?.next_status)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" /> Auto-advance Candidates
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-50">
          {actionable.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-8">No candidates ready for automatic advancement.</p>
          ) : actionable.map(c => (
            <div key={c.candidateId} className="flex items-center gap-3 px-5 py-3">
              <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-600 flex-shrink-0">
                {c.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 truncate">{c.name}</p>
                <p className="text-xs text-zinc-400">{c.suggestion.reason}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-xs text-zinc-400">{STAGE_LABELS[c.status]}</span>
                <ArrowRight className="w-3 h-3 text-zinc-400" />
                <span className="text-xs font-medium text-zinc-900">{STAGE_LABELS[c.suggestion.next_status]}</span>
              </div>
            </div>
          ))}
        </div>
        {actionable.length > 0 && (
          <div className="flex gap-2 px-5 py-4 border-t border-zinc-100">
            <button onClick={onConfirm} disabled={applying}
              className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
              {applying
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Advancing…</>
                : <><Zap className="w-3.5 h-3.5" /> Advance {actionable.length}</>}
            </button>
            <button onClick={onClose}
              className="flex-1 py-2 border border-zinc-200 text-zinc-600 hover:bg-zinc-50 text-sm font-medium rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function Pipeline() {
  const [view, setView] = useState('pipeline')

  // Pipeline table state
  const [pipelineRows,    setPipelineRows]    = useState([])
  const [pipelineLoading, setPipelineLoading] = useState(true)

  // Board state
  const [jobs,           setJobs]           = useState([])
  const [selectedJobId,  setSelectedJobId]  = useState('')
  const [columns,        setColumns]        = useState({})
  const [boardLoading,   setBoardLoading]   = useState(false)
  const [refreshing,     setRefreshing]     = useState(false)
  const [showAutoModal,  setShowAutoModal]  = useState(false)
  const [applying,       setApplying]       = useState(false)

  // Board tab nav state
  const [activeGroup,    setActiveGroup]    = useState('new')
  const [activeSubStage, setActiveSubStage] = useState(null)

  // ── Data loading ────────────────────────────────────────────────────────────
  async function loadPipelineRows(quiet = false) {
    quiet ? setRefreshing(true) : setPipelineLoading(true)
    try {
      const jobsRes = await jobsApi.list()
      const allJobs = jobsRes.data || []
      setJobs(allJobs)
      if (allJobs.length > 0 && !selectedJobId) setSelectedJobId(allJobs[0].jobId)
      const rows = await Promise.all(allJobs.map(async j => {
        try {
          const r = await analyticsApi.funnel(j.jobId)
          return { ...j, counts: r.data.status_distribution || {}, total: r.data.total || 0 }
        } catch {
          return { ...j, counts: {}, total: 0 }
        }
      }))
      setPipelineRows(rows)
    } catch { /* silent */ }
    finally { setPipelineLoading(false); setRefreshing(false) }
  }

  const loadBoard = async (quiet = false) => {
    quiet ? setRefreshing(true) : setBoardLoading(true)
    try {
      const r = await pipelineApi.board(selectedJobId)
      setColumns(r.data.columns || {})
    } catch { /* silent */ }
    finally { setBoardLoading(false); setRefreshing(false) }
  }

  useEffect(() => { loadPipelineRows() }, [])

  useEffect(() => {
    if (!selectedJobId || view !== 'board') return
    loadBoard()
  }, [selectedJobId, view])

  // ── Status change (inline dropdown) ────────────────────────────────────────
  const handleStatusChange = async (candidateId, currentStatus, newStatus) => {
    if (currentStatus === newStatus) return
    setColumns(prev => {
      const next = {}
      for (const [k, v] of Object.entries(prev)) next[k] = [...v]
      const card = (next[currentStatus] || []).find(c => c.candidateId === candidateId)
      next[currentStatus] = (next[currentStatus] || []).filter(c => c.candidateId !== candidateId)
      if (card) {
        if (!next[newStatus]) next[newStatus] = []
        next[newStatus] = [...next[newStatus], { ...card, status: newStatus }]
      }
      return next
    })
    try { await candidatesApi.updateStatus(candidateId, newStatus, selectedJobId) }
    catch { loadBoard(true) }
  }

  // ── Auto-advance ────────────────────────────────────────────────────────────
  const allCards        = Object.values(columns).flat()
  const actionableCount = allCards.filter(c => c.suggestion?.next_status).length

  const handleAutoAdvance = async () => {
    const actionable = allCards.filter(c => c.suggestion?.next_status)
    setApplying(true)
    try {
      await Promise.all(actionable.map(c =>
        candidatesApi.updateStatus(c.candidateId, c.suggestion.next_status, selectedJobId)
      ))
      setShowAutoModal(false)
      await loadBoard(true)
    } catch { /* silent */ }
    finally { setApplying(false) }
  }

  // ── Board tab derived state ─────────────────────────────────────────────────
  const groupCounts = BOARD_GROUPS.map(g => ({
    ...g,
    count: g.stages.reduce((sum, s) => sum + (columns[s]?.length || 0), 0),
  }))

  const activeGroupConfig = BOARD_GROUPS.find(g => g.key === activeGroup)

  const subStageTabs = (activeGroupConfig?.stages || []).map(s => ({
    key: s, label: STAGE_LABELS[s], count: columns[s]?.length || 0,
  }))

  const filterStages    = activeSubStage ? [activeSubStage] : (activeGroupConfig?.stages || [])
  const displayRows     = filterStages.flatMap(s => (columns[s] || []))

  return (
    <div className="page flex flex-col h-full">

      {showAutoModal && (
        <AutoAdvanceModal suggestions={allCards} onClose={() => setShowAutoModal(false)}
          onConfirm={handleAutoAdvance} applying={applying} />
      )}

      {/* Page header */}
      <div className="flex items-center justify-between mb-5 flex-shrink-0 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-zinc-900">Pipeline</h1>
          <span className="text-xs text-zinc-400">Recruitment stages</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex bg-zinc-100 rounded-full p-0.5 gap-0.5">
            {[
              { id: 'pipeline', icon: LayoutList, label: 'Pipeline View' },
              { id: 'board',    icon: Columns,    label: 'Board' },
            ].map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => setView(id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                  view === id ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'
                }`}>
                <Icon className="w-3 h-3" />{label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Pipeline Table ───────────────────────────────────────────────── */}
      {view === 'pipeline' && (
        <PipelineTable
          rows={pipelineRows}
          loading={pipelineLoading}
          onRefresh={() => loadPipelineRows(true)}
        />
      )}

      {/* ── Board View ──────────────────────────────────────────────────── */}
      {view === 'board' && (
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden flex-1 flex flex-col min-h-0">

          {/* Panel header — job selector + actions */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-200 bg-zinc-50/60 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <select value={selectedJobId} onChange={e => setSelectedJobId(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 transition min-w-[200px]">
                  <option value="">— Select a job —</option>
                  {jobs.map(j => <option key={j.jobId} value={j.jobId}>{j.title}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-2 w-3 h-3 text-zinc-400 pointer-events-none" />
              </div>
              {selectedJobId && !boardLoading && (
                <span className="text-[11px] text-zinc-400">{allCards.length} candidates</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {actionableCount > 0 && (
                <button onClick={() => setShowAutoModal(true)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-medium rounded-lg transition-colors">
                  <Zap className="w-3 h-3" /> Auto-advance ({actionableCount})
                </button>
              )}
              <button onClick={() => loadBoard(true)} disabled={refreshing || !selectedJobId}
                className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-600 disabled:opacity-40 transition-colors">
                <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
          </div>

          {!selectedJobId ? (
            <div className="flex-1 flex items-center justify-center text-zinc-400">
              <p className="text-sm">Select a job to view applications</p>
            </div>
          ) : boardLoading ? (
            <div className="flex-1 flex items-center justify-center gap-2 text-zinc-400">
              <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading…</span>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

              {/* Stage group tabs */}
              <div className="flex border-b border-zinc-200 flex-shrink-0 overflow-x-auto">
                {groupCounts.map(g => (
                  <button key={g.key}
                    onClick={() => { setActiveGroup(g.key); setActiveSubStage(null) }}
                    className={`flex items-center gap-2 px-5 py-3 text-[13px] border-b-2 transition-colors -mb-px whitespace-nowrap flex-shrink-0
                      ${activeGroup === g.key
                        ? 'border-zinc-900 text-zinc-900 font-semibold'
                        : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}>
                    <div className={`w-2.5 h-2.5 rounded-full border-2 flex-shrink-0 transition-colors
                      ${activeGroup === g.key ? 'bg-zinc-900 border-zinc-900' : 'border-zinc-300'}`} />
                    {g.label}
                    <span className="text-xs text-zinc-400 font-normal ml-0.5">{g.count}</span>
                  </button>
                ))}
              </div>

              {/* Sub-stage pill tabs (only for multi-stage groups) */}
              {subStageTabs.length > 1 && (
                <div className="flex items-center gap-1.5 px-4 py-2 border-b border-zinc-100 bg-zinc-50/30 flex-shrink-0 overflow-x-auto">
                  <button onClick={() => setActiveSubStage(null)}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors
                      ${!activeSubStage ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'}`}>
                    All&nbsp;
                    <span className={!activeSubStage ? 'text-zinc-400' : 'text-zinc-400'}>
                      {subStageTabs.reduce((s, x) => s + x.count, 0)}
                    </span>
                  </button>
                  {subStageTabs.map(ss => (
                    <button key={ss.key} onClick={() => setActiveSubStage(ss.key)}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors
                        ${activeSubStage === ss.key ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'}`}>
                      {ss.label}&nbsp;<span className="opacity-60">{ss.count}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Result count */}
              <div className="px-4 py-2 text-[11px] text-zinc-400 border-b border-zinc-100 bg-white flex-shrink-0">
                Showing {displayRows.length} application{displayRows.length !== 1 ? 's' : ''}
              </div>

              {/* Candidates table */}
              {displayRows.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm">
                  No candidates in this stage.
                </div>
              ) : (
                <div className="flex-1 overflow-auto">
                  <table className="border-collapse w-full">
                    <thead className="sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-[11px] font-medium text-zinc-500 bg-zinc-50 border-b border-zinc-200 whitespace-nowrap"
                          style={{ minWidth: 260 }}>
                          APPLICANT
                        </th>
                        <th className="px-4 py-2.5 text-left text-[11px] font-medium text-zinc-500 bg-zinc-50 border-b border-zinc-200 border-l border-zinc-100 whitespace-nowrap">
                          STAGE
                        </th>
                        <th className="px-4 py-2.5 text-left text-[11px] font-medium text-zinc-500 bg-zinc-50 border-b border-zinc-200 border-l border-zinc-100 whitespace-nowrap">
                          SKILLS
                        </th>
                        <th className="px-4 py-2.5 text-right text-[11px] font-medium text-zinc-500 bg-zinc-50 border-b border-zinc-200 border-l border-zinc-100 whitespace-nowrap">
                          DAYS
                        </th>
                        <th className="px-4 py-2.5 text-left text-[11px] font-medium text-zinc-500 bg-zinc-50 border-b border-zinc-200 border-l border-zinc-100 whitespace-nowrap">
                          STATUS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayRows.map(c => (
                        <tr key={c.candidateId} className="hover:bg-zinc-50/60 transition-colors group">

                          {/* Applicant */}
                          <td className="px-4 py-2.5 border-b border-zinc-100" style={{ minWidth: 260 }}>
                            <div className="flex items-center gap-3">
                              <ScoreBadge score={c.match_score} />
                              <div className="min-w-0">
                                <Link to={`/candidates/${c.candidateId}`}
                                  className="text-xs font-semibold text-blue-600 hover:underline truncate block leading-tight">
                                  {c.name}
                                </Link>
                                {c.email && (
                                  <p className="text-[11px] text-zinc-400 truncate leading-tight mt-0.5">{c.email}</p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Stage badge */}
                          <td className="px-4 py-2.5 border-b border-zinc-100 border-l border-zinc-100 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STAGE_BADGE[c.status] || 'bg-zinc-100 text-zinc-600'}`}>
                              {STAGE_LABELS[c.status] || c.status}
                            </span>
                          </td>

                          {/* Skills */}
                          <td className="px-4 py-2.5 border-b border-zinc-100 border-l border-zinc-100">
                            <div className="flex items-center gap-1">
                              {c.skills?.slice(0, 2).map(s => (
                                <span key={s} className="px-1.5 py-0.5 bg-zinc-100 text-zinc-500 rounded text-[10px] truncate max-w-[72px]">{s}</span>
                              ))}
                              {(c.skills?.length || 0) > 2 && (
                                <span className="text-[10px] text-zinc-400">+{c.skills.length - 2}</span>
                              )}
                              {(!c.skills || c.skills.length === 0) && (
                                <span className="text-[10px] text-zinc-300">—</span>
                              )}
                            </div>
                          </td>

                          {/* Days in stage */}
                          <td className="px-4 py-2.5 border-b border-zinc-100 border-l border-zinc-100 text-right whitespace-nowrap">
                            <span className="text-xs text-zinc-500">
                              {c.days_in_stage === 0 ? 'today' : `${c.days_in_stage}d`}
                            </span>
                          </td>

                          {/* Inline status dropdown */}
                          <td className="px-4 py-2.5 border-b border-zinc-100 border-l border-zinc-100">
                            <div className="relative inline-block">
                              <select
                                value={c.status}
                                onChange={e => handleStatusChange(c.candidateId, c.status, e.target.value)}
                                className="appearance-none pl-2.5 pr-6 py-1 border border-zinc-200 rounded-md text-[11px] text-zinc-700 bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900 cursor-pointer hover:border-zinc-300 transition-colors">
                                {ALL_STATUSES.map(s => (
                                  <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-1.5 top-1.5 w-3 h-3 text-zinc-400 pointer-events-none" />
                            </div>
                          </td>

                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
