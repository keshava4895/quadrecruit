import { useState, useEffect, useRef } from 'react'
import { jobsApi, candidatesApi, pipelineApi } from '../api'
import {
  Loader2, RefreshCw, ChevronDown, Zap, CheckCircle,
  AlertTriangle, Clock, ArrowRight, GripVertical, X,
} from 'lucide-react'

// ── Stage config ──────────────────────────────────────────────────────────────

const STAGES = [
  { key: 'sourced',     label: 'Sourced',     col: 'bg-zinc-50',     header: 'bg-zinc-100 text-zinc-600',   dot: 'bg-zinc-400' },
  { key: 'emailed',     label: 'Emailed',     col: 'bg-blue-50/40',  header: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-400' },
  { key: 'interested',  label: 'Interested',  col: 'bg-emerald-50/40', header: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400' },
  { key: 'scheduled',   label: 'Interview',   col: 'bg-amber-50/40', header: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' },
  { key: 'selected',    label: 'Selected',    col: 'bg-violet-50/40', header: 'bg-violet-100 text-violet-700', dot: 'bg-violet-400' },
  { key: 'rejected',    label: 'Rejected',    col: 'bg-red-50/30',   header: 'bg-red-100 text-red-600',     dot: 'bg-red-400' },
]

const URGENCY_ICON = {
  high:   <AlertTriangle className="w-3 h-3 text-amber-500" />,
  medium: <Clock className="w-3 h-3 text-blue-400" />,
  low:    <CheckCircle className="w-3 h-3 text-zinc-300" />,
  none:   <CheckCircle className="w-3 h-3 text-emerald-400" />,
}

const URGENCY_BG = {
  high:   'bg-amber-50 text-amber-700 border-amber-200',
  medium: 'bg-blue-50 text-blue-700 border-blue-200',
  low:    'bg-zinc-50 text-zinc-500 border-zinc-200',
  none:   'bg-emerald-50 text-emerald-700 border-emerald-200',
}

const STATUS_LABEL = {
  sourced:     'Sourced',
  emailed:     'Emailed',
  interested:  'Interested',
  scheduled:   'Interview',
  selected:    'Selected',
  rejected:    'Rejected',
  no_response: 'No Response',
}

// ── Candidate card ─────────────────────────────────────────────────────────────

function CandidateCard({
  candidate, dragging, onDragStart, onDragEnd, onApplySuggestion, onQuickMove,
}) {
  const pct   = Math.round((candidate.match_score || 0) * 100)
  const color = pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-500'
  const barW  = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-400' : 'bg-red-400'
  const { suggestion } = candidate
  const isDragging = dragging?.candidateId === candidate.candidateId

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, candidate)}
      onDragEnd={onDragEnd}
      className={`group bg-white border rounded-xl p-3.5 shadow-sm cursor-grab active:cursor-grabbing transition-all select-none
        ${isDragging ? 'opacity-30 scale-95' : 'hover:shadow-md hover:border-zinc-300 border-zinc-200'}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-600 flex-shrink-0">
            {candidate.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-900 truncate leading-tight">{candidate.name}</p>
            {candidate.experience > 0 && (
              <p className="text-[10px] text-zinc-400 leading-tight">{candidate.experience}y exp</p>
            )}
          </div>
        </div>
        <span className={`text-xs font-bold flex-shrink-0 ${color}`}>{pct}%</span>
      </div>

      {/* Score bar */}
      <div className="h-1 bg-zinc-100 rounded-full overflow-hidden mb-2.5">
        <div className={`h-full rounded-full ${barW}`} style={{ width: `${pct}%` }} />
      </div>

      {/* Skills */}
      {candidate.skills?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {candidate.skills.slice(0, 3).map(s => (
            <span key={s} className="px-1.5 py-0.5 bg-zinc-100 text-zinc-500 rounded text-[10px]">{s}</span>
          ))}
          {candidate.skills.length > 3 && (
            <span className="text-[10px] text-zinc-400">+{candidate.skills.length - 3}</span>
          )}
        </div>
      )}

      {/* Days in stage */}
      <p className="text-[10px] text-zinc-400 mb-2.5">
        {candidate.days_in_stage === 0 ? 'Added today' : `${candidate.days_in_stage}d in stage`}
      </p>

      {/* AI suggestion */}
      {suggestion && suggestion.urgency !== 'none' && (
        <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[10px] font-medium mb-2 ${URGENCY_BG[suggestion.urgency] || URGENCY_BG.low}`}>
          {URGENCY_ICON[suggestion.urgency]}
          <span className="flex-1 truncate">{suggestion.action}</span>
        </div>
      )}

      {/* Apply suggestion button */}
      {suggestion?.next_status && (
        <button
          onClick={() => onApplySuggestion(candidate, suggestion.next_status)}
          className="w-full flex items-center justify-center gap-1 py-1 bg-zinc-900 hover:bg-zinc-700 text-white text-[10px] font-medium rounded-lg transition-colors"
        >
          <ArrowRight className="w-3 h-3" />
          Move to {STATUS_LABEL[suggestion.next_status] || suggestion.next_status}
        </button>
      )}
    </div>
  )
}

// ── Column ─────────────────────────────────────────────────────────────────────

function KanbanColumn({ stage, cards, dragging, dragOver, onDragStart, onDragEnd, onDragOver, onDrop, onApplySuggestion }) {
  const isOver = dragOver === stage.key && dragging?.fromStatus !== stage.key

  return (
    <div className="flex flex-col min-w-[220px] w-[220px] flex-shrink-0">
      {/* Column header */}
      <div className={`flex items-center justify-between px-3 py-2 rounded-xl mb-2 ${stage.header}`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${stage.dot}`} />
          <span className="text-xs font-semibold">{stage.label}</span>
        </div>
        <span className="text-xs font-bold opacity-60">{cards.length}</span>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => onDragOver(e, stage.key)}
        onDrop={e => onDrop(e, stage.key)}
        className={`flex-1 min-h-[120px] rounded-xl transition-all duration-150 space-y-2 p-1
          ${isOver ? 'bg-zinc-900/5 ring-2 ring-zinc-900/20 ring-dashed' : stage.col}`}
      >
        {cards.map(c => (
          <CandidateCard
            key={c.candidateId}
            candidate={c}
            dragging={dragging}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onApplySuggestion={onApplySuggestion}
          />
        ))}
        {cards.length === 0 && (
          <div className={`flex items-center justify-center h-16 rounded-lg text-[10px] text-zinc-400 border-2 border-dashed
            ${isOver ? 'border-zinc-400' : 'border-zinc-200'}`}>
            Drop here
          </div>
        )}
      </div>
    </div>
  )
}

// ── Auto-advance preview modal ─────────────────────────────────────────────────

function AutoAdvanceModal({ suggestions, onClose, onConfirm, applying }) {
  const actionable = suggestions.filter(s => s.suggestion?.next_status)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> Auto-advance Candidates
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {actionable.length} candidate{actionable.length !== 1 ? 's' : ''} will be moved
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-zinc-50">
          {actionable.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-8">No candidates ready for automatic advancement.</p>
          ) : (
            actionable.map(c => (
              <div key={c.candidateId} className="flex items-center gap-3 px-5 py-3">
                <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-600 flex-shrink-0">
                  {c.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{c.name}</p>
                  <p className="text-xs text-zinc-400">{c.suggestion.reason}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-xs text-zinc-400">{STATUS_LABEL[c.status]}</span>
                  <ArrowRight className="w-3 h-3 text-zinc-400" />
                  <span className="text-xs font-medium text-zinc-900">{STATUS_LABEL[c.suggestion.next_status]}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {actionable.length > 0 && (
          <div className="flex gap-2 px-5 py-4 border-t border-zinc-100">
            <button
              onClick={onConfirm}
              disabled={applying}
              className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {applying
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Advancing…</>
                : <><Zap className="w-3.5 h-3.5" /> Advance {actionable.length} Candidate{actionable.length !== 1 ? 's' : ''}</>
              }
            </button>
            <button onClick={onClose} className="flex-1 py-2 border border-zinc-200 text-zinc-600 hover:bg-zinc-50 text-sm font-medium rounded-lg transition-colors">
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
  const [jobs,          setJobs]          = useState([])
  const [selectedJobId, setSelectedJobId] = useState('')
  const [columns,       setColumns]       = useState({})
  const [loading,       setLoading]       = useState(false)
  const [refreshing,    setRefreshing]    = useState(false)
  const [dragging,      setDragging]      = useState(null) // { candidateId, fromStatus, card }
  const [dragOver,      setDragOver]      = useState(null)
  const [showAutoModal, setShowAutoModal] = useState(false)
  const [applying,      setApplying]      = useState(false)

  // Load jobs on mount
  useEffect(() => {
    jobsApi.list().then(r => {
      setJobs(r.data)
      if (r.data.length > 0) setSelectedJobId(r.data[0].jobId)
    }).catch(() => {})
  }, [])

  // Load board when job changes
  useEffect(() => {
    if (!selectedJobId) return
    loadBoard()
  }, [selectedJobId])

  const loadBoard = async (quiet = false) => {
    quiet ? setRefreshing(true) : setLoading(true)
    try {
      const r = await pipelineApi.board(selectedJobId)
      setColumns(r.data.columns || {})
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false) }
  }

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const handleDragStart = (e, candidate) => {
    setDragging({ candidateId: candidate.candidateId, fromStatus: candidate.status, card: candidate })
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => { setDragging(null); setDragOver(null) }

  const handleDragOver = (e, status) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(status)
  }

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault()
    setDragOver(null)
    if (!dragging || dragging.fromStatus === targetStatus) { setDragging(null); return }

    const { candidateId, fromStatus, card } = dragging
    setDragging(null)

    // Optimistic update
    setColumns(prev => {
      const next = {}
      for (const [k, v] of Object.entries(prev)) next[k] = [...v]
      next[fromStatus] = (next[fromStatus] || []).filter(c => c.candidateId !== candidateId)
      if (!next[targetStatus]) next[targetStatus] = []
      next[targetStatus] = [...next[targetStatus], { ...card, status: targetStatus }]
      return next
    })

    try {
      await candidatesApi.updateStatus(candidateId, targetStatus, selectedJobId)
    } catch {
      // Roll back on failure
      loadBoard(true)
    }
  }

  // ── Apply single suggestion ────────────────────────────────────────────────
  const handleApplySuggestion = async (candidate, nextStatus) => {
    setColumns(prev => {
      const next = {}
      for (const [k, v] of Object.entries(prev)) next[k] = [...v]
      const fromStatus = candidate.status
      next[fromStatus] = (next[fromStatus] || []).filter(c => c.candidateId !== candidate.candidateId)
      if (!next[nextStatus]) next[nextStatus] = []
      next[nextStatus] = [...next[nextStatus], { ...candidate, status: nextStatus }]
      return next
    })
    await candidatesApi.updateStatus(candidate.candidateId, nextStatus, selectedJobId)
  }

  // ── Auto-advance all ───────────────────────────────────────────────────────
  const allCards = Object.values(columns).flat()

  const handleAutoAdvance = async () => {
    const actionable = allCards.filter(c => c.suggestion?.next_status)
    setApplying(true)
    try {
      await Promise.all(
        actionable.map(c => candidatesApi.updateStatus(c.candidateId, c.suggestion.next_status, selectedJobId))
      )
      setShowAutoModal(false)
      await loadBoard(true)
    } catch { /* silent */ }
    finally { setApplying(false) }
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalCandidates = allCards.length
  const highUrgency     = allCards.filter(c => c.suggestion?.urgency === 'high').length
  const actionableCount = allCards.filter(c => c.suggestion?.next_status).length

  const selectedJob = jobs.find(j => j.jobId === selectedJobId)

  return (
    <div className="page flex flex-col h-full">

      {showAutoModal && (
        <AutoAdvanceModal
          suggestions={allCards}
          onClose={() => setShowAutoModal(false)}
          onConfirm={handleAutoAdvance}
          applying={applying}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Pipeline Board</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Drag candidates across stages · AI suggests next actions</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadBoard(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 border border-zinc-200 text-zinc-500 hover:bg-zinc-50 text-sm font-medium rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowAutoModal(true)}
            disabled={!selectedJobId || loading || actionableCount === 0}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Zap className="w-4 h-4" />
            Auto-advance {actionableCount > 0 ? `(${actionableCount})` : ''}
          </button>
        </div>
      </div>

      {/* Job selector + KPI strip */}
      <div className="flex items-center gap-4 mb-5 flex-shrink-0">
        <div className="relative">
          <select
            value={selectedJobId}
            onChange={e => setSelectedJobId(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 transition min-w-[220px]"
          >
            <option value="">— Select a job —</option>
            {jobs.map(j => <option key={j.jobId} value={j.jobId}>{j.title}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
        </div>

        {selectedJobId && !loading && (
          <div className="flex items-center gap-3">
            <div className="bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-center">
              <p className="text-base font-bold text-zinc-900">{totalCandidates}</p>
              <p className="text-[10px] text-zinc-400">Total</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-center">
              <p className="text-base font-bold text-amber-600">{highUrgency}</p>
              <p className="text-[10px] text-amber-500">Urgent</p>
            </div>
            <div className="bg-zinc-900 rounded-lg px-3 py-1.5 text-center">
              <p className="text-base font-bold text-white">{actionableCount}</p>
              <p className="text-[10px] text-zinc-400">Auto-advanceable</p>
            </div>
          </div>
        )}
      </div>

      {/* Board */}
      {!selectedJobId ? (
        <div className="flex-1 flex items-center justify-center text-zinc-400">
          <p className="text-sm">Select a job to view its pipeline board</p>
        </div>
      ) : loading ? (
        <div className="flex-1 flex items-center justify-center gap-2 text-zinc-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading pipeline…</span>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max h-full">
            {STAGES.map(stage => (
              <KanbanColumn
                key={stage.key}
                stage={stage}
                cards={columns[stage.key] || []}
                dragging={dragging}
                dragOver={dragOver}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onApplySuggestion={handleApplySuggestion}
              />
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      {selectedJobId && !loading && (
        <div className="flex items-center gap-4 pt-3 border-t border-zinc-100 flex-shrink-0 flex-wrap">
          <p className="text-xs text-zinc-400 font-medium">AI Suggestion urgency:</p>
          {[['high', 'text-amber-500', 'High — action needed'], ['medium', 'text-blue-400', 'Medium — follow up'], ['low', 'text-zinc-400', 'Low — monitoring']].map(([u, c, label]) => (
            <span key={u} className="flex items-center gap-1 text-xs text-zinc-500">
              <span className={`w-2 h-2 rounded-full ${u === 'high' ? 'bg-amber-400' : u === 'medium' ? 'bg-blue-400' : 'bg-zinc-300'}`} />
              {label}
            </span>
          ))}
          <span className="text-xs text-zinc-400 ml-auto">Drag cards to move between stages</span>
        </div>
      )}
    </div>
  )
}
