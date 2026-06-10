import { useState, useEffect } from 'react'
import { jobsApi, candidatesApi } from '../api'
import { Upload, FileText, CheckCircle, XCircle, Cpu, X } from 'lucide-react'
import QlogoLoader from '../components/QlogoLoader'

const SELECT = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition'

export default function UploadResume() {
  const [jobs,     setJobs]     = useState([])
  const [jobId,    setJobId]    = useState('')
  const [files,    setFiles]    = useState([])
  const [results,  setResults]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => { jobsApi.list().then(r => setJobs(r.data)).catch(() => {}) }, [])

  const submit = async () => {
    if (!jobId || files.length === 0) return
    setLoading(true)
    setResults([])
    const out = []
    for (const file of files) {
      try {
        const r = await candidatesApi.uploadResume(jobId, file)
        out.push({ name: file.name, status: 'success', ...r.data })
      } catch (e) {
        out.push({ name: file.name, status: 'error', error: e.message })
      }
    }
    setResults(out)
    setLoading(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = Array.from(e.dataTransfer.files).filter(
      f => f.name.endsWith('.pdf') || f.name.endsWith('.txt') ||
           f.name.endsWith('.doc') || f.name.endsWith('.docx')
    )
    if (dropped.length) setFiles(prev => [...prev, ...dropped])
  }

  const removeFile = (name) => setFiles(prev => prev.filter(f => f.name !== name))

  const selectedJob = jobs.find(j => j.jobId === jobId)

  return (
    <div className="px-6 py-5 w-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Cpu className="w-5 h-5 text-purple-500" />
            <h1 className="text-xl font-semibold text-gray-900">Resume Scorer</h1>
          </div>
          <p className="text-sm text-gray-400">Upload resumes — AI parses and scores candidates against the job</p>
        </div>
        {files.length > 0 && (
          <button
            onClick={submit}
            disabled={loading || !jobId}
            className="px-6 py-2.5 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-all shadow-sm hover:shadow-md"
            style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}
          >
            {loading
              ? `Screening ${files.length} resume${files.length !== 1 ? 's' : ''}…`
              : `Screen ${files.length} resume${files.length !== 1 ? 's' : ''}`}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── Left: Upload Form ── */}
        <div className="flex flex-col gap-4">

          {/* Job selector */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/40">
              <p className="text-sm font-bold text-gray-800">Target Job</p>
            </div>
            <div className="px-5 py-4">
              <select className={SELECT} value={jobId} onChange={e => setJobId(e.target.value)}>
                <option value="">Select a job posting…</option>
                {jobs.map(j => <option key={j.jobId} value={j.jobId}>{j.title} — {j.jobId}</option>)}
              </select>
              {selectedJob && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {selectedJob.skills?.slice(0, 6).map(s => (
                    <span key={s} className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full">{s}</span>
                  ))}
                  {selectedJob.location && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{selectedJob.location}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Drop zone */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/40">
              <p className="text-sm font-bold text-gray-800">Resumes</p>
            </div>
            <div className="px-5 py-4">
              <label
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-10 cursor-pointer transition-colors ${
                  dragOver ? 'border-purple-400 bg-purple-50' : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/30'
                }`}
              >
                <Upload className={`w-8 h-8 mb-2.5 transition-colors ${dragOver ? 'text-purple-500' : 'text-gray-300'}`} />
                <p className="text-sm font-medium text-gray-600">
                  Drop files here or <span className="text-purple-600 underline underline-offset-2">browse</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">PDF, Word (.doc/.docx) or TXT</p>
                <input type="file" multiple accept=".pdf,.doc,.docx,.txt" className="hidden"
                  onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files)])} />
              </label>
            </div>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/40 flex items-center justify-between">
                <p className="text-sm font-bold text-gray-800">{files.length} file{files.length !== 1 ? 's' : ''} queued</p>
                <button onClick={() => setFiles([])} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Clear all</button>
              </div>
              <ul className="divide-y divide-gray-50 max-h-60 overflow-y-auto">
                {files.map(f => (
                  <li key={f.name} className="flex items-center gap-2.5 px-5 py-2.5">
                    <FileText className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    <span className="flex-1 text-xs text-gray-700 truncate">{f.name}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                    <button onClick={() => removeFile(f.name)} className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="px-5 py-3 border-t border-gray-100">
                <button
                  onClick={submit}
                  disabled={loading || !jobId}
                  className="w-full py-2.5 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-all shadow-sm hover:shadow-md"
                  style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}
                >
                  {loading
                    ? `Screening ${files.length} resume${files.length !== 1 ? 's' : ''}…`
                    : `Screen ${files.length} resume${files.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          )}

          {/* Empty state for screen button when no files */}
          {files.length === 0 && (
            <button
              disabled
              className="w-full py-2.5 opacity-30 text-white text-sm font-medium rounded-xl"
              style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}
            >
              Screen 0 resumes
            </button>
          )}
        </div>

        {/* ── Right: Results ── */}
        <div>
          {loading ? (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm h-full min-h-[280px] flex flex-col items-center justify-center text-center px-8">
              <QlogoLoader size={56} label={`Screening ${files.length} resume${files.length !== 1 ? 's' : ''}…`} />
              <p className="text-xs text-gray-400 mt-4 max-w-[220px]">AI is analyzing each resume against the job requirements</p>
            </div>
          ) : results.length > 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/40 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-800">Screening Results</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {results.filter(r => r.status === 'success').length} of {results.length} processed successfully
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    Avg: <span className="font-semibold text-gray-700">
                      {Math.round(results.filter(r=>r.status==='success').reduce((s,r)=>s+(r.match_score||0),0) / Math.max(1,results.filter(r=>r.status==='success').length) * 100)}%
                    </span>
                  </span>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {results
                  .slice()
                  .sort((a, b) => (b.match_score || 0) - (a.match_score || 0))
                  .map((r, i) => {
                    const pct = Math.round((r.match_score || 0) * 100)
                    return (
                      <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                          style={{ background: r.status === 'success' ? 'linear-gradient(135deg, #49029F, #7c3aed)' : '#f3f4f6' }}>
                          {r.status === 'success' ? i + 1 : <XCircle className="w-4 h-4 text-red-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{r.name}</p>
                          {r.status === 'success'
                            ? <p className="text-xs text-gray-400">{r.candidateId}</p>
                            : <p className="text-xs text-red-500">{r.error}</p>}
                        </div>
                        {r.status === 'success' && (
                          <div className="flex flex-col items-end flex-shrink-0">
                            <span className={`text-sm font-bold ${pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-500'}`}>
                              {pct}%
                            </span>
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                              <div className={`h-full rounded-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                                style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm h-full min-h-[280px] flex flex-col items-center justify-center text-center px-8">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'linear-gradient(135deg, #49029F22, #7c3aed22)' }}>
                <Cpu className="w-6 h-6 text-purple-600" />
              </div>
              <p className="text-sm font-semibold text-gray-700">Results will appear here</p>
              <p className="text-xs text-gray-400 mt-1 max-w-[220px]">Select a job, upload resumes, and click Screen to get AI match scores</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
