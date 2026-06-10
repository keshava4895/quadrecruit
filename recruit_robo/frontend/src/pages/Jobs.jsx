import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { jobsApi, analyticsApi } from '../api'
import { Plus, Trash2, MapPin, Briefcase, ChevronRight, X, CheckSquare, Square, Users, UserCheck, Layers } from 'lucide-react'

const EMPTY_FORM = { title: '', description: '', skills: '', experience_years: 3, location: '', positions_open: 1 }

const INPUT = 'w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition'

export default function Jobs() {
  const [jobs,      setJobs]      = useState([])
  const [overview,  setOverview]  = useState(null)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [showForm,  setShowForm]  = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [selected,  setSelected]  = useState(new Set())
  const [deleting,  setDeleting]  = useState(false)

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

      {/* Recent Jobs summary box */}
      <div className="bg-white border border-zinc-200 rounded-xl mb-6">
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
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-100 flex-shrink-0">
                  {job.status}
                </span>
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
                ? <CheckSquare className="w-4 h-4 text-zinc-900" />
                : someSelected
                  ? <CheckSquare className="w-4 h-4 text-zinc-400" />
                  : <Square className="w-4 h-4" />
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
                    ? <CheckSquare className="w-4.5 h-4.5 text-red-500" />
                    : <Square className="w-4.5 h-4.5" />
                  }
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1">
                    <Link to={`/jobs/${job.jobId}`}
                      className="text-sm font-semibold text-zinc-900 hover:text-zinc-600 transition-colors">
                      {job.title}
                    </Link>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-100">
                      {job.status}
                    </span>
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
                    {(() => {
                      const total    = job.positions_open   ?? 1
                      const filled   = job.positions_filled ?? 0
                      const remaining = Math.max(0, total - filled)
                      const full     = remaining === 0
                      return (
                        <span className={`flex items-center gap-1 font-medium ${full ? 'text-emerald-600' : 'text-amber-600'}`}>
                          <Users className="w-3 h-3" />
                          {remaining === 0 ? 'All filled' : `${remaining} open`} · {filled}/{total}
                          {full && <span className="ml-0.5 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Full</span>}
                        </span>
                      )
                    })()}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {job.skills?.slice(0, 6).map(s => (
                      <span key={s} className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-xs rounded-md">{s}</span>
                    ))}
                    {job.skills?.length > 6 && (
                      <span className="px-2 py-0.5 text-zinc-400 text-xs">+{job.skills.length - 6} more</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
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
            )
          })}
        </div>
      )}
    </div>
  )
}
