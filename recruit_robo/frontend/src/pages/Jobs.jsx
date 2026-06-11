import { useEffect, useState, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { jobsApi, analyticsApi } from '../api'
import { Plus, Trash2, MapPin, Briefcase, ChevronRight, X, CheckSquare, Square, Users, UserCheck, Layers, ChevronDown, Pencil, Filter } from 'lucide-react'

// ── Multi-select filter dropdown ───────────────────────────────────────────────
function MultiFilter({ label, options, selected, onChange, openKey, activeKey, onOpen }) {
  const ref = useRef(null)
  const isOpen = openKey === activeKey

  useEffect(() => {
    if (!isOpen) return
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) onOpen(null) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen, onOpen])

  function toggle(val) {
    const next = new Set(selected)
    next.has(val) ? next.delete(val) : next.add(val)
    onChange(next)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => onOpen(isOpen ? null : openKey)}
        className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-colors ${
          selected.size > 0
            ? 'bg-purple-50 text-purple-700 border-purple-300'
            : 'bg-white text-gray-500 border-gray-200 hover:border-purple-300 hover:text-purple-600'
        }`}>
        <Filter className="w-3 h-3" />
        {label}{selected.size > 0 ? ` (${selected.size})` : ''}
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[160px] py-1">
          <div className="px-3 py-1.5 border-b border-gray-100 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
            {selected.size > 0 && (
              <button onClick={() => onChange(new Set())} className="text-[10px] text-purple-600 hover:underline">Clear</button>
            )}
          </div>
          <div className="max-h-48 overflow-y-auto">
            {options.length === 0
              ? <p className="px-3 py-2 text-[11px] text-gray-400 italic">No values</p>
              : options.map(opt => (
                <label key={opt} className="flex items-center gap-2 px-3 py-1.5 hover:bg-purple-50 cursor-pointer">
                  <input type="checkbox" checked={selected.has(opt)} onChange={() => toggle(opt)}
                    className="w-3 h-3 rounded accent-purple-600 cursor-pointer flex-shrink-0" />
                  <span className="text-[11px] text-gray-700 truncate">{opt}</span>
                </label>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}

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
  // Core
  title: '', description: '', requirements: '', benefits: '',
  skills: '', experience_years: 3, location: '', positions_open: 1,
  rounds_technical: 1, rounds_tech_managerial: 1, rounds_managerial: 1, rounds_hr: 1,
  project: '', team: '',
  // Quadrant Details
  business_unit: '', sub_bu: '', department_name: '',
  job_opening_status: 'Requisition Created',
  date_opened: new Date().toISOString().slice(0, 10), target_date: '',
  // Handled By
  delivery_head: '', hiring_manager: '', assigned_recruiters: '',
  // Job Opening Info (extended)
  priority: '', job_approval_status: '', job_type: 'Full time',
  designation: '', work_type: '', department_lead: '', industry: '',
  min_salary: '', max_salary: '', salary_type: '', rounds_excluding_hr: '',
  // Client / Project
  client_name: '', client_name_report: '', project_name: '',
  billability_status: '', projects: '',
  // Currency & extras
  currency: 'USD',
  number_of_roles: '', pay_rate_range: '', visa_type: '', vendor_name: '',
  project_duration: '', workplace_flexibility: '', interview_type: '', security_clearance: '',
  // Address
  remote_job: false, city: '', province: '', country: '', postal_code: '',
}

const INPUT = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition'

function Th({ children, className = '', sticky }) {
  return (
    <th className={`px-3 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap border-b border-gray-100 ${sticky ? 'bg-gray-50' : ''} ${className}`}>
      {children}
    </th>
  )
}

function FormSection({ title, children }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-3.5 border-b border-gray-100 bg-gray-50/40">
        <h2 className="text-sm font-bold text-gray-800">{title}</h2>
      </div>
      <div className="px-6 py-5 grid grid-cols-2 gap-x-8 gap-y-4">
        {children}
      </div>
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}


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
  const [editForm,    setEditForm]    = useState(EMPTY_FORM)
  const [editSaving,  setEditSaving]  = useState(false)
  const [editError,   setEditError]   = useState('')
  const [filters,     setFilters]     = useState({ title: new Set(), status: new Set(), priority: new Set(), deliveryHead: new Set(), projectName: new Set() })
  const [filterOpen,  setFilterOpen]  = useState(null)

  useEffect(() => {
    const close = (e) => {
      if (!e.target.closest('[data-status-menu]')) setStatusMenu(null)
      if (!e.target.closest('[data-edit-menu]'))   setEditingJob(null)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const filteredJobs = useMemo(() => jobs.filter(job => {
    if (filters.title.size > 0        && !filters.title.has(job.title || ''))               return false
    if (filters.status.size > 0       && !filters.status.has(job.status))                   return false
    if (filters.priority.size > 0     && !filters.priority.has(job.priority || ''))         return false
    if (filters.deliveryHead.size > 0 && !filters.deliveryHead.has(job.delivery_head || '')) return false
    if (filters.projectName.size > 0  && !filters.projectName.has(job.project_name || job.project || ''))  return false
    return true
  }), [jobs, filters])

  const setFilter = (key) => (next) => setFilters(f => ({ ...f, [key]: next }))

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
      setForm({ ...EMPTY_FORM, date_opened: new Date().toISOString().slice(0, 10) })
      load()
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to create job. Please try again.')
    } finally { setLoading(false) }
  }

  const del = async (id) => {
    if (!confirm('Delete this job?')) return
    try {
      await jobsApi.delete(id)
      setJobs(prev => prev.filter(j => j.jobId !== id))
      setSelected(prev => { const next = new Set(prev); next.delete(id); return next })
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to delete job')
    }
  }

  // ── Multi-select helpers ──────────────────────────────────────────────────
  const toggleSelect = (id) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const allSelected  = filteredJobs.length > 0 && filteredJobs.every(j => selected.has(j.jobId))
  const someSelected = selected.size > 0 && !allSelected

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(filteredJobs.map(j => j.jobId)))

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

  const eSet = (k, v) => setEditForm(f => ({ ...f, [k]: v }))

  const openEdit = (job) => {
    setEditForm({
      title:                  job.title || '',
      description:            job.description || '',
      requirements:           job.requirements || '',
      benefits:               job.benefits || '',
      skills:                 Array.isArray(job.skills) ? job.skills.join(', ') : (job.skills || ''),
      experience_years:       job.experience_years ?? 3,
      location:               job.location || '',
      positions_open:         job.positions_open ?? 1,
      rounds_technical:       job.rounds_technical ?? 1,
      rounds_tech_managerial: job.rounds_tech_managerial ?? 1,
      rounds_managerial:      job.rounds_managerial ?? 1,
      rounds_hr:              job.rounds_hr ?? 1,
      project:                job.project || '',
      team:                   job.team || '',
      business_unit:          job.business_unit || '',
      sub_bu:                 job.sub_bu || '',
      department_name:        job.department_name || '',
      job_opening_status:     job.job_opening_status || 'Requisition Created',
      date_opened:            job.date_opened || '',
      target_date:            job.target_date || '',
      delivery_head:          job.delivery_head || '',
      hiring_manager:         job.hiring_manager || '',
      assigned_recruiters:    job.assigned_recruiters || '',
      priority:               job.priority || '',
      job_approval_status:    job.job_approval_status || '',
      job_type:               job.job_type || 'Full time',
      designation:            job.designation || '',
      work_type:              job.work_type || '',
      department_lead:        job.department_lead || '',
      industry:               job.industry || '',
      min_salary:             job.min_salary || '',
      max_salary:             job.max_salary || '',
      salary_type:            job.salary_type || '',
      rounds_excluding_hr:    job.rounds_excluding_hr || '',
      client_name:            job.client_name || '',
      client_name_report:     job.client_name_report || '',
      project_name:           job.project_name || '',
      billability_status:     job.billability_status || '',
      projects:               job.projects || '',
      currency:               job.currency || 'USD',
      number_of_roles:        job.number_of_roles || '',
      pay_rate_range:         job.pay_rate_range || '',
      visa_type:              job.visa_type || '',
      vendor_name:            job.vendor_name || '',
      project_duration:       job.project_duration || '',
      workplace_flexibility:  job.workplace_flexibility || '',
      interview_type:         job.interview_type || '',
      security_clearance:     job.security_clearance || '',
      remote_job:             job.remote_job || false,
      city:                   job.city || '',
      province:               job.province || '',
      country:                job.country || '',
      postal_code:            job.postal_code || '',
    })
    setEditError('')
    setEditingJob(job.jobId)
  }

  const saveEdit = async () => {
    if (!editForm.title.trim()) return
    setEditSaving(true); setEditError('')
    try {
      const payload = { ...editForm, skills: editForm.skills.split(',').map(s => s.trim()).filter(Boolean) }
      await jobsApi.patch(editingJob, payload)
      setJobs(prev => prev.map(j => j.jobId === editingJob ? { ...j, ...payload } : j))
      setEditingJob(null)
    } catch (err) {
      setEditError(err?.response?.data?.detail || err?.message || 'Failed to save changes')
    } finally { setEditSaving(false) }
  }

  return (
    <div className="px-6 py-5 w-full">

      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Jobs</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {filteredJobs.length !== jobs.length
              ? `${filteredJobs.length} of ${jobs.length} posting${jobs.length !== 1 ? 's' : ''}`
              : `${jobs.length} posting${jobs.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-xl transition-all shadow-sm hover:shadow-md"
            style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}
          >
            <Plus className="w-4 h-4" /> Create New Job
          </button>
        </div>
      </div>

      {/* Full-screen create form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#f1f0f7' }}>

          {/* Top bar */}
          <div className="bg-white border-b border-gray-200 px-6 h-14 flex items-center justify-between flex-shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <h1 className="text-sm font-semibold text-gray-900">Create Job Opening</h1>
            </div>
            <div className="flex items-center gap-2">
              {error && <span className="text-xs text-red-500 mr-2">{error}</span>}
              <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setError('') }}
                className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-xl transition-colors">
                Cancel
              </button>
              <button
                onClick={submit} disabled={loading || !form.title.trim()}
                className="px-5 py-2 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-all shadow-sm hover:shadow-md"
                style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}
              >
                {loading ? 'Creating…' : 'Create Job'}
              </button>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">

              {/* ── Quadrant Details ── */}
              <FormSection title="Quadrant Details">
                <Field label="Business Unit"><input className={INPUT} placeholder="e.g. Engineering" value={form.business_unit} onChange={e => set('business_unit', e.target.value)} /></Field>
                <Field label="Date Opened"><input type="date" className={INPUT} value={form.date_opened} onChange={e => set('date_opened', e.target.value)} /></Field>
                <Field label="Sub BU"><input className={INPUT} placeholder="e.g. Product Engineering" value={form.sub_bu} onChange={e => set('sub_bu', e.target.value)} /></Field>
                <Field label="Target Date"><input type="date" className={INPUT} value={form.target_date} onChange={e => set('target_date', e.target.value)} /></Field>
                <Field label="Department Name" required><input className={INPUT} placeholder="e.g. Software Development" value={form.department_name} onChange={e => set('department_name', e.target.value)} /></Field>
                <div />
                <Field label="Job Opening Status">
                  <select className={INPUT} value={form.job_opening_status} onChange={e => set('job_opening_status', e.target.value)}>
                    {['Requisition Created','Approved','Active','On Hold','Closed'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
              </FormSection>

              {/* ── Handled By ── */}
              <FormSection title="Handled By">
                <Field label="Delivery Head" required><input className={INPUT} placeholder="e.g. Ravi Kumar" value={form.delivery_head} onChange={e => set('delivery_head', e.target.value)} /></Field>
                <div />
                <Field label="Hiring Manager"><input className={INPUT} placeholder="e.g. Priya Mehta" value={form.hiring_manager} onChange={e => set('hiring_manager', e.target.value)} /></Field>
                <div />
                <Field label="Assigned Recruiter(s)"><input className={INPUT} placeholder="e.g. Anita, Rahul" value={form.assigned_recruiters} onChange={e => set('assigned_recruiters', e.target.value)} /></Field>
              </FormSection>

              {/* ── Job Opening Info ── */}
              <FormSection title="Job Opening Info">
                <Field label="Posting Title" required><input className={INPUT} placeholder="e.g. Senior React Developer" value={form.title} onChange={e => set('title', e.target.value)} /></Field>
                <Field label="Number of Positions"><input type="number" min="1" className={INPUT} value={form.positions_open} onChange={e => set('positions_open', Math.max(1, +e.target.value))} /></Field>
                <Field label="Priority">
                  <select className={INPUT} value={form.priority} onChange={e => set('priority', e.target.value)}>
                    <option value="">None</option>
                    {['High','Medium','Low'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Job Approval Status">
                  <select className={INPUT} value={form.job_approval_status} onChange={e => set('job_approval_status', e.target.value)}>
                    <option value="">None</option>
                    {['Pending','Approved','Rejected'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Job Type">
                  <select className={INPUT} value={form.job_type} onChange={e => set('job_type', e.target.value)}>
                    {['Full time','Part time','Contract','Internship','Freelance'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Designation">
                  <input className={INPUT} placeholder="e.g. Senior Engineer" value={form.designation} onChange={e => set('designation', e.target.value)} />
                </Field>
                <Field label="Work Type">
                  <select className={INPUT} value={form.work_type} onChange={e => set('work_type', e.target.value)}>
                    <option value="">None</option>
                    {['On-site','Remote','Hybrid'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Department Lead"><input className={INPUT} placeholder="e.g. Sunita Roy" value={form.department_lead} onChange={e => set('department_lead', e.target.value)} /></Field>
                <Field label="Work Experience (years)"><input type="number" min="0" className={INPUT} value={form.experience_years} onChange={e => set('experience_years', +e.target.value)} /></Field>
                <Field label="Required Skills">
                  <input className={INPUT} placeholder="Java, Spring Boot, SQL (comma-separated)" value={form.skills} onChange={e => set('skills', e.target.value)} />
                </Field>
                <Field label="Industry" required>
                  <select className={INPUT} value={form.industry} onChange={e => set('industry', e.target.value)}>
                    <option value="">None</option>
                    {['Information Technology','Banking & Finance','Healthcare','Manufacturing','Retail','Education','Consulting','Telecom','Media','Other'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Location"><input className={INPUT} placeholder="e.g. Bangalore / Remote" value={form.location} onChange={e => set('location', e.target.value)} /></Field>
                <Field label="Min Salary Range"><input className={INPUT} placeholder="e.g. 800000" value={form.min_salary} onChange={e => set('min_salary', e.target.value)} /></Field>
                <Field label="Max Salary Range"><input className={INPUT} placeholder="e.g. 1500000" value={form.max_salary} onChange={e => set('max_salary', e.target.value)} /></Field>
                <Field label="Salary Type">
                  <select className={INPUT} value={form.salary_type} onChange={e => set('salary_type', e.target.value)}>
                    <option value="">None</option>
                    {['Annual','Monthly','Hourly'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>

                {/* Interview rounds — full width */}
                <div className="col-span-2">
                  <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                    <p className="text-xs font-semibold text-gray-700 mb-3">Interview Rounds</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { key: 'rounds_technical',       label: 'Technical' },
                        { key: 'rounds_tech_managerial', label: 'Tech Managerial' },
                        { key: 'rounds_managerial',      label: 'Managerial' },
                        { key: 'rounds_hr',              label: 'HR' },
                      ].map(r => (
                        <div key={r.key}>
                          <label className="block text-[11px] font-medium text-gray-500 mb-1.5">{r.label}</label>
                          <input type="number" min="0" max="10" className={INPUT}
                            value={form[r.key]} onChange={e => set(r.key, Math.min(10, Math.max(0, +e.target.value)))} />
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-2">
                      Total: <span className="font-semibold text-gray-600">
                        {form.rounds_technical + form.rounds_tech_managerial + form.rounds_managerial + form.rounds_hr} rounds
                      </span>
                    </p>
                  </div>
                </div>
              </FormSection>

              {/* ── Client / Project Details ── */}
              <FormSection title="Client / Project Details">
                <Field label="Client Name" required><input className={INPUT} placeholder="e.g. Acme Corp" value={form.client_name} onChange={e => set('client_name', e.target.value)} /></Field>
                <Field label="Client Name (Report)"><input className={INPUT} placeholder="e.g. Acme Corporation" value={form.client_name_report} onChange={e => set('client_name_report', e.target.value)} /></Field>
                <Field label="Project Name"><input className={INPUT} placeholder="e.g. Project Phoenix" value={form.project_name} onChange={e => set('project_name', e.target.value)} /></Field>
                <Field label="Billability Status">
                  <select className={INPUT} value={form.billability_status} onChange={e => set('billability_status', e.target.value)}>
                    <option value="">None</option>
                    {['Billable','Non-Billable','Partial'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Project / Team"><input className={INPUT} placeholder="e.g. Backend Engineering" value={form.team} onChange={e => set('team', e.target.value)} /></Field>
                <Field label="Currency">
                  <select className={INPUT} value={form.currency} onChange={e => set('currency', e.target.value)}>
                    {['USD','INR','EUR','GBP','AED','SGD'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
              </FormSection>

              {/* ── Additional Information ── */}
              <FormSection title="Additional Information">
                <Field label="Number of Roles"><input className={INPUT} placeholder="e.g. 3" value={form.number_of_roles} onChange={e => set('number_of_roles', e.target.value)} /></Field>
                <Field label="Pay Rate Range"><input className={INPUT} placeholder="e.g. $50–$70/hr" value={form.pay_rate_range} onChange={e => set('pay_rate_range', e.target.value)} /></Field>
                <Field label="Visa Type">
                  <select className={INPUT} value={form.visa_type} onChange={e => set('visa_type', e.target.value)}>
                    <option value="">None</option>
                    {['H1B','L1','OPT','GC','Citizen','Any'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Vendor Name"><input className={INPUT} placeholder="e.g. TechStaff Inc." value={form.vendor_name} onChange={e => set('vendor_name', e.target.value)} /></Field>
                <Field label="Project Duration"><input className={INPUT} placeholder="e.g. 6 months" value={form.project_duration} onChange={e => set('project_duration', e.target.value)} /></Field>
                <Field label="Workplace Flexibility">
                  <select className={INPUT} value={form.workplace_flexibility} onChange={e => set('workplace_flexibility', e.target.value)}>
                    <option value="">None</option>
                    {['Full Remote','Hybrid','On-site'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Interview Type">
                  <select className={INPUT} value={form.interview_type} onChange={e => set('interview_type', e.target.value)}>
                    <option value="">None</option>
                    {['In-person','Virtual','Both'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Security Clearance">
                  <select className={INPUT} value={form.security_clearance} onChange={e => set('security_clearance', e.target.value)}>
                    <option value="">None</option>
                    {['None Required','Basic','Secret','Top Secret'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
              </FormSection>

              {/* ── Address Information ── */}
              <FormSection title="Address Information">
                <div className="col-span-2 flex items-center gap-2 -mb-1">
                  <input type="checkbox" id="remote_job" className="accent-purple-600 w-4 h-4"
                    checked={form.remote_job} onChange={e => set('remote_job', e.target.checked)} />
                  <label htmlFor="remote_job" className="text-sm text-gray-700 cursor-pointer">Remote Job</label>
                </div>
                <Field label="City"><input className={INPUT} placeholder="e.g. Bangalore" value={form.city} onChange={e => set('city', e.target.value)} /></Field>
                <Field label="Province / State"><input className={INPUT} placeholder="e.g. Karnataka" value={form.province} onChange={e => set('province', e.target.value)} /></Field>
                <Field label="Country">
                  <select className={INPUT} value={form.country} onChange={e => set('country', e.target.value)}>
                    <option value="">-None-</option>
                    {['India','United States','United Kingdom','Canada','Australia','Singapore','UAE','Germany','Other'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Postal Code"><input className={INPUT} placeholder="e.g. 560001" value={form.postal_code} onChange={e => set('postal_code', e.target.value)} /></Field>
              </FormSection>

              {/* ── Description Information ── */}
              <FormSection title="Description Information">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Job Description</label>
                  <textarea rows={5} className={INPUT + ' resize-none'}
                    placeholder="Describe the role, responsibilities, and day-to-day work…"
                    value={form.description} onChange={e => set('description', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Requirements</label>
                  <textarea rows={4} className={INPUT + ' resize-none'}
                    placeholder="List the skills, qualifications, and experience required…"
                    value={form.requirements} onChange={e => set('requirements', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Benefits</label>
                  <textarea rows={3} className={INPUT + ' resize-none'}
                    placeholder="Health insurance, flexible hours, stock options…"
                    value={form.benefits} onChange={e => set('benefits', e.target.value)} />
                </div>
              </FormSection>

              <div className="pb-8" />
            </div>
          </div>
        </div>
      )}

      {/* ── Full-screen EDIT form ─────────────────────────────────────────── */}
      {editingJob && (
        <div data-edit-menu className="fixed inset-0 z-50 flex flex-col" style={{ background: '#f1f0f7' }}>
          <div className="bg-white border-b border-gray-200 px-6 h-14 flex items-center justify-between flex-shrink-0 shadow-sm">
            <h1 className="text-sm font-semibold text-gray-900">Edit Job Opening</h1>
            <div className="flex items-center gap-2">
              {editError && <span className="text-xs text-red-500 mr-2">{editError}</span>}
              <button onClick={() => setEditingJob(null)}
                className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-xl transition-colors">
                Cancel
              </button>
              <button onClick={saveEdit} disabled={editSaving || !editForm.title.trim()}
                className="px-5 py-2 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-all shadow-sm hover:shadow-md"
                style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">

              <FormSection title="Quadrant Details">
                <Field label="Business Unit"><input className={INPUT} placeholder="e.g. Engineering" value={editForm.business_unit} onChange={e => eSet('business_unit', e.target.value)} /></Field>
                <Field label="Date Opened"><input type="date" className={INPUT} value={editForm.date_opened} onChange={e => eSet('date_opened', e.target.value)} /></Field>
                <Field label="Sub BU"><input className={INPUT} value={editForm.sub_bu} onChange={e => eSet('sub_bu', e.target.value)} /></Field>
                <Field label="Target Date"><input type="date" className={INPUT} value={editForm.target_date} onChange={e => eSet('target_date', e.target.value)} /></Field>
                <Field label="Department Name"><input className={INPUT} value={editForm.department_name} onChange={e => eSet('department_name', e.target.value)} /></Field>
                <div />
                <Field label="Job Opening Status">
                  <select className={INPUT} value={editForm.job_opening_status} onChange={e => eSet('job_opening_status', e.target.value)}>
                    {['Requisition Created','Approved','Active','On Hold','Closed'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
              </FormSection>

              <FormSection title="Handled By">
                <Field label="Delivery Head"><input className={INPUT} value={editForm.delivery_head} onChange={e => eSet('delivery_head', e.target.value)} /></Field>
                <div />
                <Field label="Hiring Manager"><input className={INPUT} value={editForm.hiring_manager} onChange={e => eSet('hiring_manager', e.target.value)} /></Field>
                <div />
                <Field label="Assigned Recruiter(s)"><input className={INPUT} value={editForm.assigned_recruiters} onChange={e => eSet('assigned_recruiters', e.target.value)} /></Field>
              </FormSection>

              <FormSection title="Job Opening Info">
                <Field label="Posting Title" required><input className={INPUT} value={editForm.title} onChange={e => eSet('title', e.target.value)} /></Field>
                <Field label="Number of Positions"><input type="number" min="1" className={INPUT} value={editForm.positions_open} onChange={e => eSet('positions_open', Math.max(1, +e.target.value))} /></Field>
                <Field label="Priority">
                  <select className={INPUT} value={editForm.priority} onChange={e => eSet('priority', e.target.value)}>
                    <option value="">None</option>
                    {['High','Medium','Low'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Job Approval Status">
                  <select className={INPUT} value={editForm.job_approval_status} onChange={e => eSet('job_approval_status', e.target.value)}>
                    <option value="">None</option>
                    {['Pending','Approved','Rejected'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Job Type">
                  <select className={INPUT} value={editForm.job_type} onChange={e => eSet('job_type', e.target.value)}>
                    {['Full time','Part time','Contract','Internship','Freelance'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Designation"><input className={INPUT} value={editForm.designation} onChange={e => eSet('designation', e.target.value)} /></Field>
                <Field label="Work Type">
                  <select className={INPUT} value={editForm.work_type} onChange={e => eSet('work_type', e.target.value)}>
                    <option value="">None</option>
                    {['On-site','Remote','Hybrid'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Department Lead"><input className={INPUT} value={editForm.department_lead} onChange={e => eSet('department_lead', e.target.value)} /></Field>
                <Field label="Work Experience (years)"><input type="number" min="0" className={INPUT} value={editForm.experience_years} onChange={e => eSet('experience_years', +e.target.value)} /></Field>
                <Field label="Required Skills"><input className={INPUT} placeholder="comma-separated" value={editForm.skills} onChange={e => eSet('skills', e.target.value)} /></Field>
                <Field label="Industry">
                  <select className={INPUT} value={editForm.industry} onChange={e => eSet('industry', e.target.value)}>
                    <option value="">None</option>
                    {['Information Technology','Banking & Finance','Healthcare','Manufacturing','Retail','Education','Consulting','Telecom','Media','Other'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Location"><input className={INPUT} value={editForm.location} onChange={e => eSet('location', e.target.value)} /></Field>
                <Field label="Min Salary"><input className={INPUT} value={editForm.min_salary} onChange={e => eSet('min_salary', e.target.value)} /></Field>
                <Field label="Max Salary"><input className={INPUT} value={editForm.max_salary} onChange={e => eSet('max_salary', e.target.value)} /></Field>
                <Field label="Salary Type">
                  <select className={INPUT} value={editForm.salary_type} onChange={e => eSet('salary_type', e.target.value)}>
                    <option value="">None</option>
                    {['Annual','Monthly','Hourly'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
                <div className="col-span-2">
                  <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                    <p className="text-xs font-semibold text-gray-700 mb-3">Interview Rounds</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { key: 'rounds_technical',       label: 'Technical' },
                        { key: 'rounds_tech_managerial', label: 'Tech Managerial' },
                        { key: 'rounds_managerial',      label: 'Managerial' },
                        { key: 'rounds_hr',              label: 'HR' },
                      ].map(r => (
                        <div key={r.key}>
                          <label className="block text-[11px] font-medium text-gray-500 mb-1.5">{r.label}</label>
                          <input type="number" min="0" max="10" className={INPUT}
                            value={editForm[r.key]} onChange={e => eSet(r.key, Math.min(10, Math.max(0, +e.target.value)))} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </FormSection>

              <FormSection title="Client / Project Details">
                <Field label="Client Name"><input className={INPUT} value={editForm.client_name} onChange={e => eSet('client_name', e.target.value)} /></Field>
                <Field label="Client Name (Report)"><input className={INPUT} value={editForm.client_name_report} onChange={e => eSet('client_name_report', e.target.value)} /></Field>
                <Field label="Project Name"><input className={INPUT} value={editForm.project_name} onChange={e => eSet('project_name', e.target.value)} /></Field>
                <Field label="Billability Status">
                  <select className={INPUT} value={editForm.billability_status} onChange={e => eSet('billability_status', e.target.value)}>
                    <option value="">None</option>
                    {['Billable','Non-Billable','Partial'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Project / Team"><input className={INPUT} value={editForm.team} onChange={e => eSet('team', e.target.value)} /></Field>
                <Field label="Currency">
                  <select className={INPUT} value={editForm.currency} onChange={e => eSet('currency', e.target.value)}>
                    {['USD','INR','EUR','GBP','AED','SGD'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
              </FormSection>

              <FormSection title="Additional Information">
                <Field label="Number of Roles"><input className={INPUT} value={editForm.number_of_roles} onChange={e => eSet('number_of_roles', e.target.value)} /></Field>
                <Field label="Pay Rate Range"><input className={INPUT} value={editForm.pay_rate_range} onChange={e => eSet('pay_rate_range', e.target.value)} /></Field>
                <Field label="Visa Type">
                  <select className={INPUT} value={editForm.visa_type} onChange={e => eSet('visa_type', e.target.value)}>
                    <option value="">None</option>
                    {['H1B','L1','OPT','GC','Citizen','Any'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Vendor Name"><input className={INPUT} value={editForm.vendor_name} onChange={e => eSet('vendor_name', e.target.value)} /></Field>
                <Field label="Project Duration"><input className={INPUT} value={editForm.project_duration} onChange={e => eSet('project_duration', e.target.value)} /></Field>
                <Field label="Workplace Flexibility">
                  <select className={INPUT} value={editForm.workplace_flexibility} onChange={e => eSet('workplace_flexibility', e.target.value)}>
                    <option value="">None</option>
                    {['Full Remote','Hybrid','On-site'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Interview Type">
                  <select className={INPUT} value={editForm.interview_type} onChange={e => eSet('interview_type', e.target.value)}>
                    <option value="">None</option>
                    {['In-person','Virtual','Both'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Security Clearance">
                  <select className={INPUT} value={editForm.security_clearance} onChange={e => eSet('security_clearance', e.target.value)}>
                    <option value="">None</option>
                    {['None Required','Basic','Secret','Top Secret'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
              </FormSection>

              <FormSection title="Address Information">
                <div className="col-span-2 flex items-center gap-2 -mb-1">
                  <input type="checkbox" id="edit_remote_job" className="accent-purple-600 w-4 h-4"
                    checked={editForm.remote_job} onChange={e => eSet('remote_job', e.target.checked)} />
                  <label htmlFor="edit_remote_job" className="text-sm text-gray-700 cursor-pointer">Remote Job</label>
                </div>
                <Field label="City"><input className={INPUT} value={editForm.city} onChange={e => eSet('city', e.target.value)} /></Field>
                <Field label="Province / State"><input className={INPUT} value={editForm.province} onChange={e => eSet('province', e.target.value)} /></Field>
                <Field label="Country">
                  <select className={INPUT} value={editForm.country} onChange={e => eSet('country', e.target.value)}>
                    <option value="">-None-</option>
                    {['India','United States','United Kingdom','Canada','Australia','Singapore','UAE','Germany','Other'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Postal Code"><input className={INPUT} value={editForm.postal_code} onChange={e => eSet('postal_code', e.target.value)} /></Field>
              </FormSection>

              <FormSection title="Description Information">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Job Description</label>
                  <textarea rows={5} className={INPUT + ' resize-none'} value={editForm.description} onChange={e => eSet('description', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Requirements</label>
                  <textarea rows={4} className={INPUT + ' resize-none'} value={editForm.requirements} onChange={e => eSet('requirements', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Benefits</label>
                  <textarea rows={3} className={INPUT + ' resize-none'} value={editForm.benefits} onChange={e => eSet('benefits', e.target.value)} />
                </div>
              </FormSection>

              <div className="pb-8" />
            </div>
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
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Total Open Positions',    value: totalOpenPositions, icon: Layers,    color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-100' },
              { label: 'Total Candidates Hired',  value: totalHired,         icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
              { label: 'Total Unfilled Vacancies',value: totalUnfilled,      icon: Users,     color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-100' },
            ].map(k => (
              <div key={k.label} className="bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl ${k.bg} border ${k.border} flex items-center justify-center flex-shrink-0`}>
                  <k.icon className={`w-5 h-5 ${k.color}`} />
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 mb-0.5">{k.label}</p>
                  <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                </div>
              </div>
            ))}
          </div>
        )
      })()}

      {/* Jobs table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">

        {/* Table toolbar */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3 flex-wrap">
          {/* Left: select-all + delete */}
          <button onClick={toggleAll}
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-800 transition-colors flex-shrink-0">
            {allSelected
              ? <CheckSquare className="w-3.5 h-3.5 text-purple-600" />
              : someSelected
                ? <CheckSquare className="w-3.5 h-3.5 text-gray-400" />
                : <Square className="w-3.5 h-3.5" />}
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
          {selected.size > 0 && (
            <>
              <span className="text-xs text-gray-400">{selected.size} of {filteredJobs.length} selected</span>
              <button onClick={deleteSelected} disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
                {deleting ? 'Deleting…' : `Delete ${selected.size}`}
              </button>
            </>
          )}

          {/* Right: multi-select filters */}
          {(() => {
            const uniqueTitle    = [...new Set(jobs.map(j => j.title).filter(Boolean))].sort()
            const uniqueStatus   = [...new Set(jobs.map(j => j.status).filter(Boolean))].sort()
            const uniquePriority = [...new Set(jobs.map(j => j.priority).filter(Boolean))].sort()
            const uniqueDelivery = [...new Set(jobs.map(j => j.delivery_head).filter(Boolean))].sort()
            const uniqueProject  = [...new Set(jobs.map(j => j.project_name || j.project).filter(Boolean))].sort()
            const anyFilter = filters.title.size + filters.status.size + filters.priority.size + filters.deliveryHead.size + filters.projectName.size > 0
            return (
              <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
                <MultiFilter label="Posting Title" options={uniqueTitle}    selected={filters.title}        onChange={setFilter('title')}        openKey="title"        activeKey={filterOpen} onOpen={setFilterOpen} />
                <MultiFilter label="Status"        options={uniqueStatus}   selected={filters.status}       onChange={setFilter('status')}       openKey="status"       activeKey={filterOpen} onOpen={setFilterOpen} />
                <MultiFilter label="Priority"      options={uniquePriority} selected={filters.priority}     onChange={setFilter('priority')}     openKey="priority"     activeKey={filterOpen} onOpen={setFilterOpen} />
                <MultiFilter label="Delivery Head" options={uniqueDelivery} selected={filters.deliveryHead} onChange={setFilter('deliveryHead')} openKey="deliveryHead" activeKey={filterOpen} onOpen={setFilterOpen} />
                <MultiFilter label="Project Name"  options={uniqueProject}  selected={filters.projectName}  onChange={setFilter('projectName')}  openKey="projectName"  activeKey={filterOpen} onOpen={setFilterOpen} />
                {anyFilter && (
                  <button
                    onClick={() => setFilters({ title: new Set(), status: new Set(), priority: new Set(), deliveryHead: new Set(), projectName: new Set() })}
                    className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-500 transition-colors px-1">
                    <X className="w-3 h-3" /> Clear all
                  </button>
                )}
              </div>
            )
          })()}
        </div>

        {jobs.length === 0 ? (
          <div className="text-center py-16">
            <Briefcase className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No jobs yet</p>
            <p className="text-xs text-gray-400 mt-1">Create your first job posting to get started</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-16">
            <Filter className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No jobs match the active filters</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting or clearing the filters above</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <Th sticky><span /></Th>
                  <Th sticky className="min-w-[160px]">Posting Title</Th>
                  <Th className="min-w-[120px]">Job Opening ID</Th>
                  <Th className="min-w-[120px]">Client Name</Th>
                  <Th className="min-w-[150px]">Job Opening Status</Th>
                  <Th className="min-w-[80px]">No. of Positions</Th>
                  <Th className="min-w-[80px]">Priority</Th>
                  <Th className="min-w-[120px]">Billability Status</Th>
                  <Th className="min-w-[120px]">Delivery Head</Th>
                  <Th className="min-w-[120px]">Hiring Manager</Th>
                  <Th className="min-w-[140px]">Assigned Recruiter(s)</Th>
                  <Th className="min-w-[100px]">Date Opened</Th>
                  <Th className="min-w-[100px]">Target Date</Th>
                  <Th className="min-w-[90px]">No. of Applications</Th>
                  <Th className="min-w-[90px]">Hired</Th>
                  <Th className="min-w-[120px]">Project Name</Th>
                  <Th className="min-w-[90px]">Work Type</Th>
                  <Th className="min-w-[90px]">City</Th>
                  <Th className="min-w-[90px]">Status</Th>
                  <Th><span /></Th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map(job => {
                  const isSelected = selected.has(job.jobId)
                  return (
                    <tr key={job.jobId}
                      className={`border-b border-gray-50 transition-colors ${isSelected ? 'bg-purple-50/40' : 'hover:bg-gray-50/60'}`}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-3 w-8">
                        <button onClick={() => toggleSelect(job.jobId)} className="text-gray-300 hover:text-purple-600 transition-colors">
                          {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-purple-600" /> : <Square className="w-3.5 h-3.5" />}
                        </button>
                      </td>

                      {/* Posting Title */}
                      <td className="px-3 py-3">
                        <Link to={`/jobs/${job.jobId}`}
                          className="font-semibold text-gray-900 hover:text-purple-700 transition-colors whitespace-nowrap">
                          {job.title || '—'}
                        </Link>
                        {job.skills?.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {job.skills.slice(0, 3).map(s => (
                              <span key={s} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded">{s}</span>
                            ))}
                            {job.skills.length > 3 && <span className="text-[10px] text-gray-400">+{job.skills.length - 3}</span>}
                          </div>
                        )}
                      </td>

                      {/* Job Opening ID */}
                      <td className="px-3 py-3 font-mono text-gray-500 text-[11px]">{job.jobId}</td>

                      {/* Client Name */}
                      <td className="px-3 py-3 text-gray-700">{job.client_name || <span className="text-gray-300">—</span>}</td>

                      {/* Job Opening Status */}
                      <td className="px-3 py-3">
                        {job.job_opening_status ? (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${
                            job.job_opening_status === 'Approved' || job.job_opening_status === 'Active' ? 'bg-emerald-50 text-emerald-700' :
                            job.job_opening_status === 'On Hold' ? 'bg-amber-50 text-amber-700' :
                            job.job_opening_status === 'Closed' ? 'bg-red-50 text-red-600' :
                            'bg-blue-50 text-blue-700'
                          }`}>{job.job_opening_status}</span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>

                      {/* No. of Positions */}
                      <td className="px-3 py-3 text-center">
                        <span className="font-semibold text-gray-800">{job.positions_open ?? 1}</span>
                        {job.positions_filled > 0 && (
                          <span className="text-gray-400 ml-1">({job.positions_filled} filled)</span>
                        )}
                      </td>

                      {/* Priority */}
                      <td className="px-3 py-3">
                        {job.priority ? (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            job.priority === 'High' ? 'bg-red-50 text-red-600' :
                            job.priority === 'Medium' ? 'bg-amber-50 text-amber-700' :
                            'bg-emerald-50 text-emerald-700'
                          }`}>{job.priority}</span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>

                      {/* Billability Status */}
                      <td className="px-3 py-3">
                        {job.billability_status ? (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            job.billability_status === 'Billable' ? 'bg-violet-50 text-violet-700' :
                            job.billability_status === 'Partial' ? 'bg-amber-50 text-amber-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{job.billability_status}</span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>

                      {/* Delivery Head */}
                      <td className="px-3 py-3 text-gray-700">{job.delivery_head || <span className="text-gray-300">—</span>}</td>

                      {/* Hiring Manager */}
                      <td className="px-3 py-3 text-gray-700">{job.hiring_manager || <span className="text-gray-300">—</span>}</td>

                      {/* Assigned Recruiter(s) */}
                      <td className="px-3 py-3 text-gray-700 max-w-[140px] truncate">{job.assigned_recruiters || <span className="text-gray-300">—</span>}</td>

                      {/* Date Opened */}
                      <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                        {job.date_opened ? new Date(job.date_opened).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : <span className="text-gray-300">—</span>}
                      </td>

                      {/* Target Date */}
                      <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                        {job.target_date ? (
                          <span className={new Date(job.target_date) < new Date() ? 'text-red-500' : ''}>
                            {new Date(job.target_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>

                      {/* No. of Applications */}
                      <td className="px-3 py-3 text-center text-gray-700">{job.candidate_count ?? <span className="text-gray-300">—</span>}</td>

                      {/* Hired */}
                      <td className="px-3 py-3 text-center">
                        <span className={`font-semibold ${(job.positions_filled ?? 0) > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {job.positions_filled ?? 0}
                        </span>
                      </td>

                      {/* Project Name */}
                      <td className="px-3 py-3 text-gray-700">{job.project_name || job.project || <span className="text-gray-300">—</span>}</td>

                      {/* Work Type */}
                      <td className="px-3 py-3">
                        {job.work_type ? (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            job.work_type === 'Remote' ? 'bg-blue-50 text-blue-700' :
                            job.work_type === 'Hybrid' ? 'bg-purple-50 text-purple-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{job.work_type}</span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>

                      {/* City */}
                      <td className="px-3 py-3 text-gray-700">{job.city || job.location || <span className="text-gray-300">—</span>}</td>

                      {/* Status (listing status) */}
                      <td className="px-3 py-3">
                        <div className="relative" data-status-menu>
                          {(() => {
                            const s = statusStyle(job.status)
                            return (
                              <button
                                onClick={e => { e.stopPropagation(); setStatusMenu(prev => prev === job.jobId ? null : job.jobId) }}
                                className={`flex items-center gap-1 px-2.5 py-1 ${s.bg} ${s.text} ${s.border} border text-[10px] font-medium rounded-full hover:opacity-80 transition-opacity whitespace-nowrap`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                                {s.label}
                                <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                              </button>
                            )
                          })()}
                          {statusMenu === job.jobId && (
                            <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-100 rounded-lg shadow-lg z-30 py-1 overflow-hidden">
                              {STATUS_OPTIONS.map(opt => (
                                <button key={opt.value}
                                  onClick={e => { e.stopPropagation(); updateStatus(job.jobId, opt.value) }}
                                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors ${job.status === opt.value ? 'font-semibold' : 'text-gray-700'}`}>
                                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${opt.dot}`} />
                                  {opt.label}
                                  {job.status === opt.value && <span className="ml-auto text-gray-400">✓</span>}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <Link to={`/jobs/${job.jobId}`}
                            className="p-1.5 text-gray-300 hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-100">
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                          <button onClick={() => openEdit(job)} title="Edit job"
                            className="p-1.5 text-purple-400 hover:text-purple-600 transition-colors rounded-lg hover:bg-purple-50">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => del(job.jobId)}
                            className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
