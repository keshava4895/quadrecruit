import { useState, useEffect, useRef } from 'react'
import { offersApi, candidatesApi, jobsApi } from '../api'
import QlogoLoader from '../components/QlogoLoader'
import { Plus, Edit2, Trash2, X, Check, Search, FileText } from 'lucide-react'

const STATUS_CONFIG = {
  draft:       { label: 'Draft',       color: 'bg-gray-100 text-gray-600' },
  sent:        { label: 'Sent',        color: 'bg-blue-50 text-blue-700' },
  negotiating: { label: 'Negotiating', color: 'bg-amber-50 text-amber-700' },
  accepted:    { label: 'Accepted',    color: 'bg-emerald-50 text-emerald-700' },
  declined:    { label: 'Declined',    color: 'bg-red-50 text-red-600' },
  withdrawn:   { label: 'Withdrawn',   color: 'bg-gray-100 text-gray-500' },
}
const STATUSES = ['draft', 'sent', 'negotiating', 'accepted', 'declined', 'withdrawn']

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
  )
}

export default function Offers() {
  const [offers, setOffers]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [filter, setFilter]         = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [editOffer, setEditOffer]   = useState(null)
  const [flash, setFlash]           = useState('')

  // Create form
  const [jobs, setJobs]                   = useState([])
  const [candSearch, setCandSearch]       = useState('')
  const [candidates, setCandidates]       = useState([])
  const [candSearching, setCandSearching] = useState(false)
  const [selectedCand, setSelectedCand]   = useState(null)
  const [createForm, setCreateForm]       = useState({ jobId: '', ctc: '', joining_date: '', notes: '' })
  const [creating, setCreating]           = useState(false)
  const candDropRef                       = useRef(null)

  // Edit form
  const [editForm, setEditForm] = useState({ status: '', ctc: '', joining_date: '', notes: '' })
  const [saving, setSaving]     = useState(false)

  function showFlash(msg) {
    setFlash(msg)
    setTimeout(() => setFlash(''), 3000)
  }

  useEffect(() => {
    loadOffers()
    jobsApi.list().then(r => setJobs(r.data || [])).catch(() => {})
  }, [])

  // Close candidate dropdown on outside click
  useEffect(() => {
    function onOut(e) {
      if (candDropRef.current && !candDropRef.current.contains(e.target)) setCandidates([])
    }
    document.addEventListener('mousedown', onOut)
    return () => document.removeEventListener('mousedown', onOut)
  }, [])

  // Debounced candidate search
  useEffect(() => {
    if (!candSearch.trim()) { setCandidates([]); return }
    setCandSearching(true)
    const t = setTimeout(async () => {
      try {
        const r = await candidatesApi.listAll({ search: candSearch, limit: 10 })
        setCandidates(r.data?.candidates || [])
      } catch { } finally { setCandSearching(false) }
    }, 280)
    return () => clearTimeout(t)
  }, [candSearch])

  async function loadOffers() {
    setLoading(true)
    try { const r = await offersApi.list(); setOffers(r.data || []) }
    catch { } finally { setLoading(false) }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!selectedCand || !createForm.jobId) return
    setCreating(true)
    try {
      await offersApi.create({
        candidateId:  selectedCand.candidateId,
        jobId:        createForm.jobId,
        ctc:          createForm.ctc ? parseFloat(createForm.ctc) : null,
        joining_date: createForm.joining_date || null,
        notes:        createForm.notes || null,
      })
      showFlash('Offer created')
      setShowCreate(false)
      setSelectedCand(null)
      setCandSearch('')
      setCreateForm({ jobId: '', ctc: '', joining_date: '', notes: '' })
      await loadOffers()
    } catch (err) {
      showFlash(err.response?.data?.detail || 'Failed to create offer')
    } finally { setCreating(false) }
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await offersApi.update(editOffer.offerId, {
        status:       editForm.status || undefined,
        ctc:          editForm.ctc ? parseFloat(editForm.ctc) : undefined,
        joining_date: editForm.joining_date || undefined,
        notes:        editForm.notes,
      })
      showFlash('Offer updated')
      setEditOffer(null)
      await loadOffers()
    } catch (err) {
      showFlash(err.response?.data?.detail || 'Failed to update offer')
    } finally { setSaving(false) }
  }

  async function handleDelete(offer) {
    if (!window.confirm(`Delete offer for ${offer.candidateName}?`)) return
    try {
      await offersApi.delete(offer.offerId)
      showFlash('Offer deleted')
      setOffers(prev => prev.filter(o => o.offerId !== offer.offerId))
    } catch { showFlash('Failed to delete offer') }
  }

  function openEdit(offer) {
    setEditOffer(offer)
    setEditForm({
      status:       offer.status || 'draft',
      ctc:          offer.ctc != null ? String(offer.ctc) : '',
      joining_date: offer.joining_date || '',
      notes:        offer.notes || '',
    })
  }

  const filtered = filter === 'all' ? offers : offers.filter(o => o.status === filter)

  const counts = {
    total:    offers.length,
    accepted: offers.filter(o => o.status === 'accepted').length,
    pending:  offers.filter(o => ['draft', 'sent', 'negotiating'].includes(o.status)).length,
    declined: offers.filter(o => o.status === 'declined').length,
  }

  return (
    <div className="px-6 py-5 w-full">

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Offer Management</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track and manage candidate offer letters</p>
        </div>
        <button
          onClick={() => { setShowCreate(v => !v); setSelectedCand(null); setCandSearch(''); setCreateForm({ jobId: '', ctc: '', joining_date: '', notes: '' }) }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-xl shadow-sm transition-all"
          style={{ background: showCreate ? '#6b7280' : 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
          {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showCreate ? 'Cancel' : 'Create Offer'}
        </button>
      </div>

      {/* Flash */}
      {flash && (
        <div className="mb-4 px-4 py-2.5 bg-purple-50 border border-purple-100 rounded-xl text-sm text-purple-700 flex items-center gap-2">
          <Check className="w-4 h-4 text-purple-500 flex-shrink-0" />{flash}
        </div>
      )}

      {/* Create form panel */}
      {showCreate && (
        <div className="mb-5 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">New Offer</h3>
          <form onSubmit={handleCreate}>
            <div className="grid grid-cols-2 gap-4">

              {/* Candidate search — spans full width */}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Candidate *</label>
                {selectedCand ? (
                  <div className="flex items-center gap-3 bg-purple-50 border border-purple-100 rounded-xl px-3 py-2.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
                      {selectedCand.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{selectedCand.name}</p>
                      <p className="text-xs text-gray-400">{selectedCand.email}</p>
                    </div>
                    <button type="button" onClick={() => setSelectedCand(null)}
                      className="text-gray-400 hover:text-gray-600 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative" ref={candDropRef}>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={candSearch} onChange={e => setCandSearch(e.target.value)}
                      placeholder="Search by name or email…"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-50" />
                    {candSearch && (
                      <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-lg z-20 overflow-hidden">
                        {candSearching && <p className="px-3 py-2 text-xs text-gray-400">Searching…</p>}
                        {!candSearching && candidates.length === 0 && (
                          <p className="px-3 py-2 text-xs text-gray-400">No candidates found</p>
                        )}
                        {candidates.map(c => (
                          <button key={c.candidateId} type="button"
                            onClick={() => { setSelectedCand(c); setCandSearch(''); setCandidates([]) }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-purple-50 text-left transition-colors">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
                              {c.name?.charAt(0)?.toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                              <p className="text-xs text-gray-400 truncate">{c.email}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Job */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Job *</label>
                <select value={createForm.jobId} onChange={e => setCreateForm(f => ({ ...f, jobId: e.target.value }))}
                  className="w-full py-2 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-purple-300 bg-white" required>
                  <option value="">Select a job…</option>
                  {jobs.map(j => <option key={j.jobId} value={j.jobId}>{j.title}</option>)}
                </select>
              </div>

              {/* CTC */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">CTC (LPA)</label>
                <input type="number" step="0.5" value={createForm.ctc}
                  onChange={e => setCreateForm(f => ({ ...f, ctc: e.target.value }))}
                  placeholder="e.g. 18"
                  className="w-full py-2 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-purple-300" />
              </div>

              {/* Joining date */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Joining Date</label>
                <input type="date" value={createForm.joining_date}
                  onChange={e => setCreateForm(f => ({ ...f, joining_date: e.target.value }))}
                  className="w-full py-2 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-purple-300" />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes</label>
                <input type="text" value={createForm.notes}
                  onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Internal notes (optional)"
                  className="w-full py-2 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-purple-300" />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button type="submit" disabled={creating || !selectedCand || !createForm.jobId}
                className="px-5 py-2 text-sm font-medium text-white rounded-xl disabled:opacity-40 transition-all shadow-sm"
                style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
                {creating ? 'Creating…' : 'Create Offer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Offers', value: counts.total,    color: 'text-gray-900' },
          { label: 'Accepted',     value: counts.accepted, color: 'text-emerald-600' },
          { label: 'In Progress',  value: counts.pending,  color: 'text-amber-600' },
          { label: 'Declined',     value: counts.declined, color: 'text-red-500' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
        {['all', ...STATUSES].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              filter === s ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label}
            {' '}
            <span className="text-[10px] text-gray-400">
              ({s === 'all' ? offers.length : offers.filter(o => o.status === s).length})
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <QlogoLoader size={48} label="Loading offers…" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-5 h-5 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-400">
              {filter === 'all' ? 'No offers yet' : `No ${STATUS_CONFIG[filter]?.label?.toLowerCase()} offers`}
            </p>
            {filter === 'all' && (
              <p className="text-xs text-gray-300 mt-1">Click "Create Offer" to get started</p>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                {['Candidate', 'Job', 'Status', 'CTC', 'Joining Date', 'Created By', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(offer => (
                <tr key={offer.offerId} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
                        {offer.candidateName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{offer.candidateName}</p>
                        <p className="text-xs text-gray-400 truncate">{offer.candidateEmail}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-700 max-w-[160px] truncate">{offer.jobTitle}</p>
                  </td>

                  <td className="px-4 py-3">
                    <StatusBadge status={offer.status} />
                  </td>

                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-700">
                      {offer.ctc != null ? `₹${offer.ctc} LPA` : '—'}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-700">
                      {offer.joining_date
                        ? new Date(offer.joining_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <p className="text-xs text-gray-500">{offer.created_by_name || '—'}</p>
                    <p className="text-[10px] text-gray-300">
                      {offer.created_at ? new Date(offer.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                    </p>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(offer)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(offer)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit modal */}
      {editOffer && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Edit Offer</h3>
                <p className="text-xs text-gray-400 mt-0.5">{editOffer.candidateName} · {editOffer.jobTitle}</p>
              </div>
              <button onClick={() => setEditOffer(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {STATUSES.map(s => (
                    <button key={s} type="button"
                      onClick={() => setEditForm(f => ({ ...f, status: s }))}
                      className={`py-1.5 px-2 text-xs font-medium rounded-lg border transition-all ${
                        editForm.status === s
                          ? 'border-purple-300 text-purple-700 bg-purple-50'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                      {STATUS_CONFIG[s]?.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">CTC (LPA)</label>
                  <input type="number" step="0.5" value={editForm.ctc}
                    onChange={e => setEditForm(f => ({ ...f, ctc: e.target.value }))}
                    placeholder="e.g. 18"
                    className="w-full py-2 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-purple-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Joining Date</label>
                  <input type="date" value={editForm.joining_date}
                    onChange={e => setEditForm(f => ({ ...f, joining_date: e.target.value }))}
                    className="w-full py-2 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-purple-300" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes</label>
                <textarea value={editForm.notes}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3} placeholder="Internal notes…"
                  className="w-full py-2 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-purple-300 resize-none" />
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setEditOffer(null)}
                  className="flex-1 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 text-sm font-medium text-white rounded-xl disabled:opacity-40 transition-all"
                  style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
