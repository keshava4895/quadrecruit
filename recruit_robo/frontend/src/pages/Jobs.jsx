import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { jobsApi } from '../api'
import { Plus, Trash2, MapPin, Briefcase, ChevronRight, X, Clock } from 'lucide-react'

const EMPTY_FORM = { title: '', description: '', skills: '', experience_years: 3, location: '' }

const INPUT = 'w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition'

export default function Jobs() {
  const [jobs,     setJobs]     = useState([])
  const [form,     setForm]     = useState(EMPTY_FORM)
  const [showForm, setShowForm] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const load = () => jobsApi.list().then(r => setJobs(r.data))
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
    load()
  }

  return (
    <div className="page">

      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Jobs</h1>
          <p className="text-sm text-zinc-400 mt-0.5">{jobs.length} active posting{jobs.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> Create New Job
        </button>
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

      {/* Job list */}
      {jobs.length > 0 && (
        <div className="space-y-2">
          {jobs.map(job => (
            <div key={job.jobId}
              className="bg-white border border-zinc-200 rounded-xl px-5 py-4 flex items-center gap-4 hover:border-zinc-300 transition-colors group">
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
          ))}
        </div>
      )}
    </div>
  )
}
