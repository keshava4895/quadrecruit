import { useEffect, useState, useCallback, useRef } from 'react'
import QlogoLoader from '../components/QlogoLoader'
import { Link } from 'react-router-dom'
import { candidatesApi, jobsApi } from '../api'
import {
  Database, Search, X, Filter, Users, ChevronLeft, ChevronRight, RefreshCw, Mail, Phone, Briefcase, Trash2,
  ExternalLink, Upload, FileText, CheckCircle, AlertCircle,
  CloudUpload, ChevronDown, ShieldAlert,
} from 'lucide-react'

const STATUS_OPTS = ['', 'sourced', 'emailed', 'interested', 'scheduled', 'selected', 'rejected', 'no_response']

const STATUS_STYLE = {
  sourced:     'bg-gray-100 text-gray-600',
  emailed:     'bg-blue-50 text-blue-700',
  interested:  'bg-emerald-50 text-emerald-700',
  scheduled:   'bg-amber-50 text-amber-700',
  selected:    'bg-violet-50 text-violet-700',
  rejected:    'bg-red-50 text-red-600',
  no_response: 'bg-gray-100 text-gray-400',
}

function inferSource(email) {
  if (!email) return { label: 'Direct', color: 'bg-emerald-50 text-emerald-700' }
  if (email.includes('@portal.placeholder')) return { label: 'Portal',  color: 'bg-blue-50 text-blue-600' }
  if (email.includes('@placeholder'))        return { label: 'Upload',  color: 'bg-amber-50 text-amber-700' }
  return { label: 'Direct', color: 'bg-emerald-50 text-emerald-700' }
}

function ScoreBar({ score }) {
  const pct   = Math.round((score || 0) * 100)
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-400' : pct > 0 ? 'bg-red-400' : 'bg-gray-200'
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-7 text-right">{pct > 0 ? `${pct}%` : '—'}</span>
    </div>
  )
}

// ── Upload Modal ──────────────────────────────────────────────────────────────
function UploadModal({ onClose, onDone }) {
  const [jobs, setJobs]           = useState([])
  const [jobId, setJobId]         = useState('')
  const [files, setFiles]         = useState([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver]   = useState(false)
  const inputRef                  = useRef(null)

  useEffect(() => {
    jobsApi.list()
      .then(r => setJobs(r.data || []))
      .catch(() => {})
  }, [])

  function addFiles(newFiles) {
    const valid = Array.from(newFiles).filter(f =>
      /\.(pdf|doc|docx|txt)$/i.test(f.name)
    )
    setFiles(prev => {
      const existing = new Set(prev.map(x => x.file.name))
      const fresh = valid.filter(f => !existing.has(f.name)).map(f => ({
        file: f, status: 'pending', result: null, error: null,
      }))
      return [...prev, ...fresh]
    })
  }

  function removeFile(name) {
    setFiles(prev => prev.filter(x => x.file.name !== name))
  }

  async function handleUpload() {
    if (!files.length) return
    setUploading(true)
    const updated = [...files]
    for (let i = 0; i < updated.length; i++) {
      if (updated[i].status === 'done') continue
      updated[i] = { ...updated[i], status: 'uploading' }
      setFiles([...updated])
      try {
        const r = await candidatesApi.uploadToPool(updated[i].file, jobId || null)
        updated[i] = { ...updated[i], status: 'done', result: r.data }
      } catch (e) {
        const msg = e.response?.data?.detail || 'Upload failed'
        updated[i] = { ...updated[i], status: 'error', error: msg }
      }
      setFiles([...updated])
    }
    setUploading(false)
  }

  function handleClose() {
    if (files.some(f => f.status === 'done')) onDone()
    onClose()
  }

  const allDone    = files.length > 0 && files.every(x => x.status === 'done')
  const pendingCnt = files.filter(x => x.status === 'pending').length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <CloudUpload className="w-4 h-4 text-purple-500" />
            <h2 className="text-sm font-semibold text-gray-900">Upload Resumes to Talent Pool</h2>
          </div>
          <button onClick={handleClose} disabled={uploading}
            className="text-gray-400 hover:text-gray-700 disabled:opacity-40 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div
            onClick={() => !uploading && inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
              ${dragOver ? 'border-violet-400 bg-violet-50' : 'border-gray-200 hover:border-violet-300 hover:bg-gray-50'}
              ${uploading ? 'pointer-events-none opacity-50' : ''}`}
          >
            <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">
              Drop resume files here, or <span className="text-violet-600">click to browse</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX, TXT — multiple files supported</p>
            <input ref={inputRef} type="file" multiple accept=".pdf,.doc,.docx,.txt"
              className="hidden" onChange={e => addFiles(e.target.files)} />
          </div>

          {files.length > 0 && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {files.map(({ file, status, result, error }) => (
                <div key={file.name} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl">
                  <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{file.name}</p>
                    {status === 'done' && result && (
                      <p className="text-[10px] text-emerald-600 truncate">
                        {result.name}{result.email ? ` · ${result.email}` : ''}
                      </p>
                    )}
                    {status === 'error' && (
                      <p className="text-[10px] text-red-500 truncate">{error}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {status === 'pending'   && !uploading && (
                      <button onClick={() => removeFile(file.name)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {status === 'uploading' && <QlogoLoader size={14} />}
                    {status === 'done'      && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                    {status === 'error'     && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Link to a job <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <select value={jobId} onChange={e => setJobId(e.target.value)} disabled={uploading}
                className="w-full pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-violet-500 appearance-none disabled:opacity-50">
                <option value="">No job — add to pool only</option>
                {jobs.map(j => <option key={j.jobId} value={j.jobId}>{j.title}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
            {jobId && (
              <p className="text-[10px] text-gray-400 mt-1">
                Candidates will be linked to this job and scored against it.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <p className="text-xs text-gray-400">
            {files.length === 0 ? 'No files selected' : `${files.length} file${files.length > 1 ? 's' : ''} selected`}
            {uploading && pendingCnt > 0 && ` · ${pendingCnt} remaining`}
          </p>
          <div className="flex gap-2">
            <button onClick={handleClose} disabled={uploading}
              className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors">
              Cancel
            </button>
            <button onClick={handleUpload} disabled={files.length === 0 || uploading || allDone}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium disabled:opacity-40 text-white rounded-xl transition-all shadow-sm hover:shadow-md"
              style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
              {uploading
                ? <><QlogoLoader size={14} /> Uploading…</>
                : allDone
                  ? <><CheckCircle className="w-3.5 h-3.5" /> Done</>
                  : <><Upload className="w-3.5 h-3.5" /> Upload {files.length > 0 ? files.length : ''} Resume{files.length !== 1 ? 's' : ''}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Shared cell classes (matches Analytics grid style) ────────────────────────
const TH  = 'px-3 py-2 text-left text-[11px] font-medium text-gray-500 bg-gray-50 border-b border-gray-100 whitespace-nowrap'
const THL = `${TH} border-l border-gray-100`
const TD  = 'px-3 py-1.5 text-xs text-gray-700 border-b border-gray-100'
const TDL = `${TD} border-l border-gray-100`

// ── Main Page ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 25

export default function CandidateDatabase() {
  const [candidates, setCandidates]     = useState([])
  const [total, setTotal]               = useState(0)
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatus]       = useState('')
  const [page, setPage]                 = useState(0)
  const [deleting, setDeleting]         = useState(null)
  const [showUpload, setShowUpload]     = useState(false)
  const [selected, setSelected]         = useState(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const searchTimer                     = useRef(null)
  const selectAllRef                    = useRef(null)

  const load = useCallback((q = search, s = statusFilter, p = page) => {
    setLoading(true)
    candidatesApi.listAll({ search: q, status: s, skip: p * PAGE_SIZE, limit: PAGE_SIZE })
      .then(r => { setCandidates(r.data.candidates || []); setTotal(r.data.total || 0) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [search, statusFilter, page])

  useEffect(() => { load() }, [])

  function onSearchChange(val) {
    setSearch(val); setPage(0)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => load(val, statusFilter, 0), 350)
  }

  function onStatusChange(val) {
    setStatus(val); setPage(0); load(search, val, 0)
  }

  function onPageChange(newPage) {
    setPage(newPage); load(search, statusFilter, newPage)
  }

  useEffect(() => {
    if (!selectAllRef.current) return
    const allChecked  = candidates.length > 0 && candidates.every(c => selected.has(c.candidateId))
    const someChecked = candidates.some(c => selected.has(c.candidateId))
    selectAllRef.current.checked       = allChecked
    selectAllRef.current.indeterminate = !allChecked && someChecked
  }, [selected, candidates])

  function toggleOne(id) {
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  function toggleAll() {
    const allChecked = candidates.every(c => selected.has(c.candidateId))
    if (allChecked) {
      setSelected(prev => { const next = new Set(prev); candidates.forEach(c => next.delete(c.candidateId)); return next })
    } else {
      setSelected(prev => { const next = new Set(prev); candidates.forEach(c => next.add(c.candidateId)); return next })
    }
  }

  async function handleDelete(c) {
    if (!window.confirm(`Permanently delete ${c.name} from the database? This cannot be undone.`)) return
    setDeleting(c.candidateId)
    try {
      await candidatesApi.remove(c.candidateId)
      setCandidates(prev => prev.filter(x => x.candidateId !== c.candidateId))
      setSelected(prev => { const next = new Set(prev); next.delete(c.candidateId); return next })
      setTotal(t => t - 1)
    } catch {}
    setDeleting(null)
  }

  async function deleteSelected() {
    if (!window.confirm(`Permanently delete ${selected.size} candidate${selected.size > 1 ? 's' : ''}? This cannot be undone.`)) return
    setBulkDeleting(true)
    for (const id of [...selected]) {
      try {
        await candidatesApi.remove(id)
        setCandidates(prev => prev.filter(x => x.candidateId !== id))
        setTotal(t => t - 1)
      } catch {}
    }
    setSelected(new Set())
    setBulkDeleting(false)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="px-6 py-5 w-full">

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onDone={() => {
            setPage(0); setLoading(true)
            candidatesApi.listAll({ search, status: statusFilter, skip: 0, limit: PAGE_SIZE })
              .then(r => { setCandidates(r.data.candidates || []); setTotal(r.data.total || 0) })
              .catch(() => {})
              .finally(() => setLoading(false))
          }}
        />
      )}

      {/* Page header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-violet-500" />
          <h1 className="text-lg font-bold text-gray-900">Talent Pool</h1>
          <span className="text-xs text-gray-400 ml-1">Candidate database</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selected.size > 0 && (
            <button onClick={deleteSelected} disabled={bulkDeleting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg transition-colors">
              {bulkDeleting ? <QlogoLoader size={14} /> : <Trash2 className="w-3.5 h-3.5" />}
              Delete {selected.size} selected
            </button>
          )}
          <button onClick={() => load()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white rounded-xl transition-all shadow-sm hover:shadow-md"
            style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
            <Upload className="w-3.5 h-3.5" /> Load Resume
          </button>
        </div>
      </div>

      {/* White panel — panel header + filters + table all in one card */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">

        {/* Panel header strip (matches Analytics style) */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/60 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search name, email, skills…"
                value={search}
                onChange={e => onSearchChange(e.target.value)}
                className="pl-7 pr-6 py-1 text-[11px] border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 w-52"
              />
              {search && (
                <button onClick={() => onSearchChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Status filter */}
            <div className="relative">
              <Filter className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              <select value={statusFilter} onChange={e => onStatusChange(e.target.value)}
                className="pl-6 pr-6 py-1 text-[11px] border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 appearance-none cursor-pointer">
                <option value="">All statuses</option>
                {STATUS_OPTS.filter(Boolean).map(s => (
                  <option key={s} value={s}>{s.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <span className="text-[11px] text-gray-400">
            {total > 0 ? `${total.toLocaleString()} candidate${total !== 1 ? 's' : ''}` : 'No candidates yet'}
          </span>
        </div>

        {/* Table content */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
            <QlogoLoader size={40} label="Loading…" />
          </div>
        ) : candidates.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">
              {search || statusFilter ? 'No candidates match your filters.' : 'No candidates in the database yet.'}
            </p>
            {(search || statusFilter) ? (
              <button onClick={() => { setSearch(''); setStatus(''); setPage(0); load('', '', 0) }}
                className="mt-2 text-xs text-blue-600 hover:underline">Clear filters</button>
            ) : (
              <button onClick={() => setShowUpload(true)}
                className="mt-3 flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white rounded-xl transition-all shadow-sm hover:shadow-md mx-auto"
                style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
                <Upload className="w-3.5 h-3.5" /> Upload first resume
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className={TH + ' w-8'}>
                    <input type="checkbox" ref={selectAllRef} onChange={toggleAll}
                      className="w-3 h-3 rounded accent-purple-600 cursor-pointer" />
                  </th>
                  <th className={`${THL} w-8`}>#</th>
                  <th className={THL}>Candidate</th>
                  <th className={THL}>Contact</th>
                  <th className={THL}>Skills</th>
                  <th className={THL}>Exp</th>
                  <th className={THL}>Best Score</th>
                  <th className={THL}>Jobs</th>
                  <th className={THL}>Status</th>
                  <th className={THL}>Source</th>
                  <th className={`${THL} w-10`} />
                </tr>
              </thead>
              <tbody>
                {candidates.map((c, i) => {
                  const src = inferSource(c.email)
                  const displayEmail = c.email?.includes('@portal.placeholder') || c.email?.includes('@placeholder') ? '' : c.email
                  const isSelected = selected.has(c.candidateId)
                  const rowBase = isSelected ? 'bg-purple-50/30' : 'hover:bg-gray-50/80'
                  return (
                    <tr key={c.candidateId} className={`transition-colors group ${rowBase}`}>
                      <td className={TD}>
                        <input type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(c.candidateId)}
                          className="w-3 h-3 rounded accent-purple-600 cursor-pointer" />
                      </td>
                      <td className={`${TDL} text-gray-400`}>{page * PAGE_SIZE + i + 1}</td>

                      <td className={TDL}>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
                            {c.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <Link to={`/candidates/${c.candidateId}`}
                              className="font-medium text-blue-600 hover:underline whitespace-nowrap flex items-center gap-1">
                              {c.name}
                              <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-50 transition-opacity" />
                            </Link>
                            <p className="text-[10px] text-gray-400 font-mono">{c.candidateId}</p>
                          </div>
                        </div>
                      </td>

                      <td className={TDL}>
                        <div className="space-y-0.5">
                          {displayEmail && (
                            <a href={`mailto:${displayEmail}`}
                              className="flex items-center gap-1 text-gray-500 hover:text-gray-800 transition-colors whitespace-nowrap">
                              <Mail className="w-3 h-3 flex-shrink-0" />
                              <span className="max-w-[130px] truncate">{displayEmail}</span>
                            </a>
                          )}
                          {c.phone && (
                            <p className="flex items-center gap-1 text-gray-400">
                              <Phone className="w-3 h-3 flex-shrink-0" />{c.phone}
                            </p>
                          )}
                          {!displayEmail && !c.phone && <span className="text-gray-300">—</span>}
                        </div>
                      </td>

                      <td className={TDL}>
                        <div className="flex flex-wrap gap-1 max-w-[170px]">
                          {c.skills?.slice(0, 3).map(s => (
                            <span key={s} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">{s}</span>
                          ))}
                          {c.skills?.length > 3 && (
                            <span className="text-[10px] text-gray-400">+{c.skills.length - 3}</span>
                          )}
                          {(!c.skills || c.skills.length === 0) && <span className="text-gray-300">—</span>}
                        </div>
                      </td>

                      <td className={TDL + ' whitespace-nowrap'}>
                        {c.experience > 0 ? (
                          <span className="flex items-center gap-1 text-gray-600">
                            <Briefcase className="w-3 h-3 text-gray-400" />{c.experience} yr{c.experience !== 1 ? 's' : ''}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>

                      <td className={TDL}>
                        <ScoreBar score={c.best_score} />
                      </td>

                      <td className={TDL + ' text-center'}>
                        {c.job_count > 0 ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full">
                            {c.job_count}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>

                      <td className={TDL}>
                        {c.status ? (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${STATUS_STYLE[c.status] || STATUS_STYLE.sourced}`}>
                            {c.status.replace('_', ' ')}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>

                      <td className={TDL}>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${src.color}`}>
                          {src.label}
                        </span>
                      </td>

                      <td className={TDL}>
                        <button
                          onClick={() => handleDelete(c)}
                          disabled={deleting === c.candidateId}
                          className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40"
                          title="Delete candidate">
                          {deleting === c.candidateId
                            ? <QlogoLoader size={14} />
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

        {/* Pagination — inside the card */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50/40">
            <p className="text-[11px] text-gray-400">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total.toLocaleString()}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => onPageChange(page - 1)} disabled={page === 0}
                className="p-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = totalPages <= 7 ? i : page < 4 ? i : page > totalPages - 4 ? totalPages - 7 + i : page - 3 + i
                return (
                  <button key={p} onClick={() => onPageChange(p)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors border ${
                      p === page ? 'text-white border-purple-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                    style={p === page ? { background: 'linear-gradient(135deg, #49029F, #7c3aed)' } : {}}>
                    {p + 1}
                  </button>
                )
              })}
              <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages - 1}
                className="p-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


