import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { candidatesApi } from '../api'
import {
  Database, Search, X, Filter, Users, ChevronLeft, ChevronRight,
  Loader2, RefreshCw, Mail, Phone, Briefcase, Star, Trash2,
  ExternalLink,
} from 'lucide-react'

const STATUS_OPTS = ['', 'sourced', 'emailed', 'interested', 'scheduled', 'selected', 'rejected', 'no_response']

const STATUS_STYLE = {
  sourced:     'bg-zinc-100 text-zinc-600',
  emailed:     'bg-blue-50 text-blue-700',
  interested:  'bg-emerald-50 text-emerald-700',
  scheduled:   'bg-amber-50 text-amber-700',
  selected:    'bg-violet-50 text-violet-700',
  rejected:    'bg-red-50 text-red-600',
  no_response: 'bg-zinc-100 text-zinc-400',
}

function inferSource(email) {
  if (!email) return { label: 'Direct', color: 'bg-zinc-100 text-zinc-500' }
  if (email.includes('@portal.placeholder')) return { label: 'Portal', color: 'bg-blue-50 text-blue-600' }
  if (email.includes('@placeholder'))        return { label: 'Upload', color: 'bg-amber-50 text-amber-700' }
  return { label: 'Direct', color: 'bg-emerald-50 text-emerald-700' }
}

function ScoreBar({ score }) {
  const pct   = Math.round((score || 0) * 100)
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-400' : pct > 0 ? 'bg-red-400' : 'bg-zinc-200'
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-zinc-500 w-7 text-right">{pct > 0 ? `${pct}%` : '—'}</span>
    </div>
  )
}

const PAGE_SIZE = 25

export default function CandidateDatabase() {
  const [candidates, setCandidates] = useState([])
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState('')
  const [page, setPage]             = useState(0)
  const [deleting, setDeleting]     = useState(null)
  const searchTimer                 = useRef(null)

  const load = useCallback((q = search, s = statusFilter, p = page) => {
    setLoading(true)
    candidatesApi.listAll({ search: q, status: s, skip: p * PAGE_SIZE, limit: PAGE_SIZE })
      .then(r => { setCandidates(r.data.candidates || []); setTotal(r.data.total || 0) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [search, statusFilter, page])

  useEffect(() => { load() }, [])  // initial load

  function onSearchChange(val) {
    setSearch(val)
    setPage(0)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => load(val, statusFilter, 0), 350)
  }

  function onStatusChange(val) {
    setStatus(val)
    setPage(0)
    load(search, val, 0)
  }

  function onPageChange(newPage) {
    setPage(newPage)
    load(search, statusFilter, newPage)
  }

  async function handleDelete(c) {
    if (!window.confirm(`Permanently delete ${c.name} from the database? This cannot be undone.`)) return
    setDeleting(c.candidateId)
    try {
      await candidatesApi.remove(c.candidateId)
      setCandidates(prev => prev.filter(x => x.candidateId !== c.candidateId))
      setTotal(t => t - 1)
    } catch {}
    setDeleting(null)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="page">

      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-violet-500" /> Candidate Database
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {total > 0 ? `${total.toLocaleString()} candidates stored` : 'All candidates in your database'}
          </p>
        </div>
        <button onClick={() => load()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-500 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search name, email, skills…"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {search && (
            <button onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="relative">
          <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
          <select
            value={statusFilter}
            onChange={e => onStatusChange(e.target.value)}
            className="pl-8 pr-4 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none">
            <option value="">All statuses</option>
            {STATUS_OPTS.filter(Boolean).map(s => (
              <option key={s} value={s}>{s.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-zinc-400">
            <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading…</span>
          </div>
        ) : candidates.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
            <p className="text-sm text-zinc-400">
              {search || statusFilter ? 'No candidates match your filters.' : 'No candidates in the database yet.'}
            </p>
            {(search || statusFilter) && (
              <button onClick={() => { setSearch(''); setStatus(''); setPage(0); load('', '', 0) }}
                className="mt-2 text-xs text-blue-600 hover:underline">Clear filters</button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 w-8">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Candidate</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Skills</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Exp</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Best Score</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Jobs</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Source</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {candidates.map((c, i) => {
                  const src = inferSource(c.email)
                  const displayEmail = c.email?.includes('@portal.placeholder') || c.email?.includes('@placeholder') ? '' : c.email
                  return (
                    <tr key={c.candidateId} className="hover:bg-zinc-50 transition-colors group">
                      <td className="px-4 py-3 text-xs text-zinc-400">{page * PAGE_SIZE + i + 1}</td>

                      {/* Name + ID */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {c.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <Link to={`/candidates/${c.candidateId}`}
                              className="font-medium text-zinc-900 hover:text-blue-600 transition-colors whitespace-nowrap flex items-center gap-1">
                              {c.name}
                              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                            </Link>
                            <p className="text-[10px] text-zinc-400 font-mono">{c.candidateId}</p>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          {displayEmail && (
                            <a href={`mailto:${displayEmail}`}
                              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 transition-colors whitespace-nowrap">
                              <Mail className="w-3 h-3 flex-shrink-0" />
                              <span className="max-w-[140px] truncate">{displayEmail}</span>
                            </a>
                          )}
                          {c.phone && (
                            <p className="flex items-center gap-1 text-xs text-zinc-400">
                              <Phone className="w-3 h-3 flex-shrink-0" />{c.phone}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Skills */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {c.skills?.slice(0, 3).map(s => (
                            <span key={s} className="px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded text-[10px]">{s}</span>
                          ))}
                          {c.skills?.length > 3 && (
                            <span className="text-[10px] text-zinc-400">+{c.skills.length - 3}</span>
                          )}
                          {(!c.skills || c.skills.length === 0) && <span className="text-xs text-zinc-300">—</span>}
                        </div>
                      </td>

                      {/* Experience */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {c.experience > 0 ? (
                          <span className="flex items-center gap-1 text-xs text-zinc-600">
                            <Briefcase className="w-3 h-3 text-zinc-400" />{c.experience} yr{c.experience !== 1 ? 's' : ''}
                          </span>
                        ) : <span className="text-zinc-300 text-xs">—</span>}
                      </td>

                      {/* Best Match Score */}
                      <td className="px-4 py-3">
                        <ScoreBar score={c.best_score} />
                      </td>

                      {/* Jobs count */}
                      <td className="px-4 py-3">
                        {c.job_count > 0 ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full">
                            {c.job_count}
                          </span>
                        ) : <span className="text-zinc-300 text-xs">—</span>}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {c.status ? (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${STATUS_STYLE[c.status] || STATUS_STYLE.sourced}`}>
                            {c.status.replace('_', ' ')}
                          </span>
                        ) : <span className="text-zinc-300 text-xs">—</span>}
                      </td>

                      {/* Source */}
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${src.color}`}>
                          {src.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(c)}
                          disabled={deleting === c.candidateId}
                          className="text-zinc-300 hover:text-red-500 transition-colors disabled:opacity-40"
                          title="Delete candidate">
                          {deleting === c.candidateId
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-xs text-zinc-400">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total.toLocaleString()}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
              className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = totalPages <= 7 ? i : page < 4 ? i : page > totalPages - 4 ? totalPages - 7 + i : page - 3 + i
              return (
                <button key={p} onClick={() => onPageChange(p)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
                    p === page
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50'
                  }`}>
                  {p + 1}
                </button>
              )
            })}
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
