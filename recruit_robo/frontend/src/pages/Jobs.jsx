import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { jobsApi, analyticsApi } from '../api'
import { Plus, Trash2, MapPin, Briefcase, ChevronRight, X, CheckSquare, Square, Users, UserCheck, Layers, ChevronDown, Pencil } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'active',    label: 'Active',    dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-100' },
  { value: 'inactive',  label: 'Inactive',  dot: 'bg-zinc-400',    text: 'text-zinc-600',    bg: 'bg-zinc-100',    border: 'border-zinc-200'    },
  { value: 'on_hold',   label: 'On Hold',   dot: 'bg-amber-400',   text: 'text-amber-700',   bg: 'bg-amber-50',    border: 'border-amber-100'   },
  { value: 'closed',    label: 'Closed',    dot: 'bg-red-400',     text: 'text-red-700',     bg: 'bg-red-50',      border: 'border-red-100'     },
]

function statusStyle(status) {
  return STATUS_OPTIONS.find(o => o.value === status) ?? STATUS_OPTIONS[0]
}

const EMPTY_FORM = {
  title: '', description: '', skills: '', experience_years: 3, location: '', positions_open: 1,
  rounds_technical: 1, rounds_tech_managerial: 1, rounds_managerial: 1, rounds_hr: 1,
  project: '', team: '',
}

const INPUT = 'w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition'


export default function Jobs() {
  const [jobs,      setJobs]      = useState([])
  const [overview,  setOverview]  = useState(null)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [showForm,  setShowForm]  = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [selected,   setSelected]   = useState(new Set())
  const [deleting,   setDeleting]   = useState(false)
  const [statusMenu,  setStatusMenu]  = useState(null)
  const [editingJob,  setEditingJob]  = useState(null)
  const [editForm,    setEditForm]    = useState({ project: '', team: '', description: '' })
  const [editSaving,  setEditSaving]  = useState(false)

  useEffect(() => {
    const close = (e) => {
      if (!e.target.closest('[data-status-menu]')) setStatusMenu(null)
      if (!e.target.closest('[data-edit-menu]'))   setEditingJob(null)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const load = () => Promise.all([
    jobsApi.list(),
    analyticsApi.overview(),
  ]).then(([jr, or]) => {
    setJobs(jr.data || [])
    setOverview(or.data)
  }).catch(() => jobsApi.list().then(r => setJobs(r.data || [])))

  useEffect(() => { load() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.title.trim()) return
    const totalRounds = form.rounds_technical + form.rounds_tech_managerial + form.rounds_managerial + form.rounds_hr
    if (totalRounds === 0) { setError('Please specify at least 1 interview round.'); return }
    setLoading(true)
    setError('')
    try {
      await jobsApi.create({
        ...form,
        skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
      })
      setShowForm(false)
      setForm(EMPTY_FORM)
      load()
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to create job. Please try again.')
    } finally { setLoading(false) }
  }

  const del = async (id) => {
    if (!confirm('Delete this job?')) return
    await jobsApi.delete(id)
    setSelected(prev => { const next = new Set(prev); next.delete(id); return next })
    load()
  }

  // ── Multi-select helpers ──────────────────────────────────────────────────
  const toggleSelect = (id) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const allSelected  = jobs.length > 0 && selected.size === jobs.length
  const someSelected = selected.size > 0 && !allSelected

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(jobs.map(j => j.jobId)))

  const deleteSelected = async () => {
    if (!selected.size) return
    if (!confirm(`Delete ${selected.size} job${selected.size > 1 ? 's' : ''}? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await Promise.all([...selected].map(id => jobsApi.delete(id)))
      setSelected(new Set())
      load()
    } finally { setDeleting(false) }
  }

  const updateStatus = async (jobId, status) => {
    await jobsApi.patch(jobId, { status })
    setJobs(prev => prev.map(j => j.jobId === jobId ? { ...j, status } : j))
    setStatusMenu(null)
  }

  const openEdit = (job) => {
    setEditForm({ project: job.project || '', team: job.team || '', description: job.description || '' })
    setEditingJob(job.jobId)
  }

  const saveEdit = async (jobId) => {
    setEditSaving(true)
    try {
      await jobsApi.patch(jobId, editForm)
      setJobs(prev => prev.map(j => j.jobId === jobId ? { ...j, ...editForm } : j))
      setEditingJob(null)
    } finally { setEditSaving(false) }
  }

  return (
    <div className="page">

      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Jobs</h1>
          <p className="text-sm text-zinc-400 mt-0.5">{jobs.length} active posting{jobs.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              onClick={deleteSelected}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Deleting…' : `Delete ${selected.size} selected`}
            </button>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Create New Job
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white border border-zinc-200 rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-zinc-900">New Job Posting</h2>
            <button onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-zinc-700 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Job Title *</label>
              <input className={INPUT} placeholder="e.g. Senior React Developer"
                value={form.title} onChange={e => set('title', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Location</label>
              <input className={INPUT} placeholder="e.g. Bangalore / Remote"
                value={form.location} onChange={e => set('location', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Project</label>
              <input className={INPUT} placeholder="e.g. Project Phoenix"
                value={form.project} onChange={e => set('project', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Team</label>
              <input className={INPUT} placeholder="e.g. Backend Engineering"
                value={form.team} onChange={e => set('team', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Required Skills</label>
              <input className={INPUT} placeholder="Java, Spring Boot, SQL"
                value={form.skills} onChange={e => set('skills', e.target.value)} />
              <p className="text-xs text-zinc-400 mt-1">Comma-separated</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Min Experience (years)</label>
              <input type="number" min="0" className={INPUT}
                value={form.experience_years} onChange={e => set('experience_years', +e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Positions Open</label>
              <input type="number" min="1" className={INPUT}
                value={form.positions_open} onChange={e => set('positions_open', Math.max(1, +e.target.value))} />
              <p className="text-xs text-zinc-400 mt-1">Number of vacancies for this role</p>
            </div>

            {/* Interview rounds — full-width section */}
            <div className="md:col-span-2">
              <div className="border border-zinc-100 rounded-xl p-4 bg-zinc-50/50">
                <p className="text-xs font-semibold text-zinc-700 mb-3">Interview Rounds <span className="text-red-500">*</span></p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { key: 'rounds_technical',       label: 'Technical' },
                    { key: 'rounds_tech_managerial', label: 'Tech Managerial' },
                    { key: 'rounds_managerial',      label: 'Managerial' },
                    { key: 'rounds_hr',              label: 'HR' },
                  ].map(r => (
                    <div key={r.key}>
                      <label className="block text-[11px] font-medium text-zinc-500 mb-1.5">{r.label}</label>
                      <input
                        type="number" min="0" max="10"
                        className={INPUT}
                        value={form[r.key]}
                        onChange={e => set(r.key, Math.min(10, Math.max(0, +e.target.value)))}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-zinc-400 mt-2">
                  Total: <span className="font-semibold text-zinc-600">
                    {form.rounds_technical + form.rounds_tech_managerial + form.rounds_managerial + form.rounds_hr} round{(form.rounds_technical + form.rounds_tech_managerial + form.rounds_managerial + form.rounds_hr) !== 1 ? 's' : ''}
                  </span>
                </p>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Job Description</label>
              <textarea rows={4} className={INPUT + ' resize-none'}
                placeholder="Describe the role, responsibilities, and requirements…"
                value={form.description} onChange={e => set('description', e.target.value)} />
            </div>
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="flex items-center gap-3 mt-5 pt-5 border-t border-zinc-100">
            <button
              onClick={submit} disabled={loading || !form.title.trim()}
              className="px-5 py-2 bg-zinc-900 hover:bg-zinc-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loading ? 'Creating…' : 'Create Job'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-5 py-2 border border-zinc-200 text-zinc-600 hover:bg-zinc-50 text-sm font-medium rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* KPI strip */}
      {(() => {
        const activeJobs         = jobs.filter(j => j.status === 'active')
        const totalOpenPositions = activeJobs.length
        const totalHired         = jobs.reduce((sum, j) => sum + (j.positions_filled ?? 0), 0)
        const totalUnfilled      = activeJobs.reduce((sum, j) =>
          sum + Math.max(0, (j.positions_open ?? 1) - (j.positions_filled ?? 0)), 0
        )

        return (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Total Open Positions',    value: totalOpenPositions, icon: Layers,    color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-100' },
              { label: 'Total Candidates Hired',  value: totalHired,         icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
              { label: 'Total Unfilled Vacancies',value: totalUnfilled,      icon: Users,     color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-100' },
            ].map(k => (
              <div key={k.label} className="bg-white border border-zinc-200 rounded-xl px-5 py-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl ${k.bg} border ${k.border} flex items-center justify-center flex-shrink-0`}>
                  <k.icon className={`w-5 h-5 ${k.color}`} />
                </div>
                <div>
                  <p className="text-[11px] text-zinc-400 mb-0.5">{k.label}</p>
                  <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                </div>
              </div>
            ))}
          </div>
        )
      })()}

      {/* Job list with multi-select */}
      {jobs.length > 0 && (
        <div className="space-y-2">

          {/* Select all bar */}
          <div className="flex items-center gap-3 px-3 py-2">
            <button
              onClick={toggleAll}
              className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
            >
              {allSelected
                ? <CheckSquare className="w-3 h-3 text-zinc-900" />
                : someSelected
                  ? <CheckSquare className="w-3 h-3 text-zinc-400" />
                  : <Square className="w-3 h-3" />
              }
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
            {selected.size > 0 && (
              <span className="text-xs text-zinc-400">
                {selected.size} of {jobs.length} selected
              </span>
            )}
          </div>

          {jobs.map(job => {
            const isSelected = selected.has(job.jobId)
            return (
              <div key={job.jobId}
                className={`bg-white border rounded-xl px-5 py-4 flex items-center gap-4 transition-colors group ${
                  isSelected
                    ? 'border-red-200 bg-red-50/40'
                    : 'border-zinc-200 hover:border-zinc-300'
                }`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleSelect(job.jobId)}
                  className="flex-shrink-0 text-zinc-300 hover:text-zinc-600 transition-colors"
                >
                  {isSelected
                    ? <CheckSquare className="w-3 h-3 text-red-500" />
                    : <Square className="w-3 h-3" />
                  }
                </button>

                {/* Left: job info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Link to={`/jobs/${job.jobId}`}
                      className="text-sm font-semibold text-zinc-900 hover:text-zinc-600 transition-colors">
                      {job.title}
                    </Link>
                    {job.project && (
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-medium rounded-md">
                        {job.project}
                      </span>
                    )}
                    {job.team && (
                      <span className="px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-100 text-[10px] font-medium rounded-md">
                        {job.team}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-400 mb-2.5">
                    <span className="font-mono">{job.jobId}</span>
                    {job.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />{job.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />{job.experience_years}+ yrs
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {job.skills?.slice(0, 6).map(s => (
                      <span key={s} className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-xs rounded-md">{s}</span>
                    ))}
                    {job.skills?.length > 6 && (
                      <span className="px-2 py-0.5 text-zinc-400 text-xs">+{job.skills.length - 6} more</span>
                    )}
                  </div>
                  {/* Interview rounds */}
                  {(job.rounds_technical || job.rounds_tech_managerial || job.rounds_managerial || job.rounds_hr) ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      {[
                        { label: 'Technical',  val: job.rounds_technical },
                        { label: 'Tech Mgr',   val: job.rounds_tech_managerial },
                        { label: 'Managerial', val: job.rounds_managerial },
                        { label: 'HR',         val: job.rounds_hr },
                      ].filter(r => r.val > 0).map(r => (
                        <span key={r.label} className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 text-violet-700 border border-violet-100 text-[10px] font-medium rounded-full">
                          {r.val} {r.label}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                {/* Right: status + position top, actions bottom */}
                <div className="flex flex-col items-end justify-between gap-3 flex-shrink-0 self-stretch">
                  {/* Top-right: status dropdown + position metric + edit */}
                  <div className="flex items-center gap-2">
                    {/* Position metric */}
                    {(() => {
                      const total     = job.positions_open   ?? 1
                      const filled    = job.positions_filled ?? 0
                      const remaining = Math.max(0, total - filled)
                      const full      = remaining === 0
                      return (
                        <span className={`flex items-center gap-1 text-xs font-medium ${full ? 'text-emerald-600' : 'text-amber-600'}`}>
                          <Users className="w-3.5 h-3.5" />
                          {full ? 'All filled' : `${remaining} open`} · {filled}/{total}
                          {full && <span className="ml-0.5 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Full</span>}
                        </span>
                      )
                    })()}
                    {/* Status dropdown */}
                    <div className="relative" data-status-menu>
                      {(() => {
                        const s = statusStyle(job.status)
                        return (
                          <button
                            onClick={e => { e.stopPropagation(); setStatusMenu(prev => prev === job.jobId ? null : job.jobId) }}
                            className={`flex items-center gap-1 px-2.5 py-1 ${s.bg} ${s.text} ${s.border} border text-xs font-medium rounded-full hover:opacity-80 transition-opacity`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                            {s.label}
                            <ChevronDown className="w-3 h-3 opacity-60" />
                          </button>
                        )
                      })()}
                      {statusMenu === job.jobId && (
                        <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-zinc-200 rounded-lg shadow-lg z-30 py-1 overflow-hidden">
                          {STATUS_OPTIONS.map(opt => (
                            <button
                              key={opt.value}
                              onClick={e => { e.stopPropagation(); updateStatus(job.jobId, opt.value) }}
                              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-zinc-50 transition-colors ${
                                job.status === opt.value ? 'font-semibold' : 'text-zinc-700'
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${opt.dot}`} />
                              {opt.label}
                              {job.status === opt.value && <span className="ml-auto text-zinc-400">✓</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Edit popover */}
                    <div className="relative" data-edit-menu>
                      <button
                        onClick={e => { e.stopPropagation(); editingJob === job.jobId ? setEditingJob(null) : openEdit(job) }}
                        className={`p-1.5 rounded-lg transition-colors ${editingJob === job.jobId ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {editingJob === job.jobId && (
                        <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-zinc-200 rounded-xl shadow-xl z-40 p-4">
                          <p className="text-xs font-semibold text-zinc-800 mb-3">Edit Job Details</p>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-[11px] font-medium text-zinc-500 mb-1">Project</label>
                              <input
                                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-xs bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 transition"
                                placeholder="e.g. Project Phoenix"
                                value={editForm.project}
                                onChange={e => setEditForm(f => ({ ...f, project: e.target.value }))}
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-zinc-500 mb-1">Team</label>
                              <input
                                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-xs bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 transition"
                                placeholder="e.g. Backend Engineering"
                                value={editForm.team}
                                onChange={e => setEditForm(f => ({ ...f, team: e.target.value }))}
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-zinc-500 mb-1">Description</label>
                              <textarea
                                rows={3}
                                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-xs bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 transition resize-none"
                                placeholder="Job description…"
                                value={editForm.description}
                                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                              />
                            </div>
                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={e => { e.stopPropagation(); saveEdit(job.jobId) }}
                                disabled={editSaving}
                                className="flex-1 py-1.5 bg-zinc-900 hover:bg-zinc-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                              >
                                {editSaving ? 'Saving…' : 'Save'}
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); setEditingJob(null) }}
                                className="flex-1 py-1.5 border border-zinc-200 text-zinc-600 hover:bg-zinc-50 text-xs font-medium rounded-lg transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Bottom-right: action buttons */}
                  <div className="flex items-center gap-1">
                    <Link to={`/jobs/${job.jobId}`}
                      className="p-2 text-zinc-300 hover:text-zinc-700 transition-colors rounded-lg hover:bg-zinc-50">
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                    <button onClick={() => del(job.jobId)}
                      className="p-2 text-zinc-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Recent Jobs summary box */}
      <div className="bg-white border border-zinc-200 rounded-xl mt-6">
        <div className="px-5 py-4 border-b border-zinc-100">
          <p className="text-sm font-semibold text-zinc-900">Recent Jobs</p>
          <p className="text-xs text-zinc-400 mt-0.5">Latest job postings across your organisation</p>
        </div>
        {jobs.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="w-9 h-9 text-zinc-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-zinc-500">No jobs yet</p>
            <p className="text-xs text-zinc-400 mt-1">Create your first job posting to get started</p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-50">
            {jobs.slice(0, 5).map(job => (
              <li key={job.jobId} className="flex items-center gap-3 px-5 py-3">
                <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-3.5 h-3.5 text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <Link to={`/jobs/${job.jobId}`}
                    className="text-sm font-medium text-zinc-800 hover:text-zinc-600 transition-colors truncate block">
                    {job.title}
                  </Link>
                  <p className="text-xs text-zinc-400 truncate">
                    {job.jobId}{job.location ? ` · ${job.location}` : ''}
                  </p>
                </div>
                {(() => {
                  const s = statusStyle(job.status)
                  return (
                    <span className={`px-2 py-0.5 ${s.bg} ${s.text} ${s.border} border text-xs font-medium rounded-full flex-shrink-0 flex items-center gap-1`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      {s.label}
                    </span>
                  )
                })()}
              </li>
            ))}
          </ul>
        )}
        {jobs.length > 5 && (
          <div className="px-5 py-3 border-t border-zinc-50">
            <p className="text-xs text-zinc-400">+{jobs.length - 5} more postings below</p>
          </div>
        )}
      </div>
    </div>
  )
}
