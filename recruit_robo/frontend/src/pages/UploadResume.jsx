import { useState } from 'react'
import { jobsApi, candidatesApi } from '../api'
import { Upload, FileText, CheckCircle, XCircle, Cpu } from 'lucide-react'

const SELECT = 'w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition'

export default function UploadResume() {
  const [jobs,    setJobs]    = useState([])
  const [jobId,   setJobId]   = useState('')
  const [files,   setFiles]   = useState([])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  useState(() => { jobsApi.list().then(r => setJobs(r.data)) })

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
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.pdf') || f.name.endsWith('.txt'))
    if (dropped.length) setFiles(dropped)
  }

  return (
    <div className="page max-w-3xl">

      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Cpu className="w-5 h-5 text-zinc-400" />
          <h1 className="text-xl font-semibold text-zinc-900">Resume Scorer</h1>
        </div>
        <p className="text-sm text-zinc-400">Upload resumes — AI parses and scores candidates against the job</p>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">

        {/* Select job */}
        <div className="px-6 py-5 border-b border-zinc-100">
          <label className="block text-xs font-medium text-zinc-500 mb-2">Target Job</label>
          <select className={SELECT} value={jobId} onChange={e => setJobId(e.target.value)}>
            <option value="">Select a job posting…</option>
            {jobs.map(j => <option key={j.jobId} value={j.jobId}>{j.title} — {j.jobId}</option>)}
          </select>
        </div>

        {/* Upload area */}
        <div className="px-6 py-5 border-b border-zinc-100">
          <label className="block text-xs font-medium text-zinc-500 mb-2">Resumes</label>
          <label
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-10 cursor-pointer transition-colors ${
              dragOver ? 'border-zinc-400 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300'
            }`}
          >
            <Upload className={`w-7 h-7 mb-2 transition-colors ${dragOver ? 'text-zinc-600' : 'text-zinc-300'}`} />
            <p className="text-sm font-medium text-zinc-500">Drop files here or <span className="text-zinc-900 underline underline-offset-2">browse</span></p>
            <p className="text-xs text-zinc-400 mt-1">PDF or TXT files</p>
            <input type="file" multiple accept=".pdf,.txt" className="hidden"
              onChange={e => setFiles(Array.from(e.target.files))} />
          </label>

          {files.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {files.map(f => (
                <li key={f.name} className="flex items-center gap-2 text-xs text-zinc-600 bg-zinc-50 rounded-lg px-3 py-2">
                  <FileText className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                  {f.name}
                  <span className="ml-auto text-zinc-400">{(f.size / 1024).toFixed(0)} KB</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Action */}
        <div className="px-6 py-4">
          <button
            onClick={submit}
            disabled={loading || !jobId || !files.length}
            className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading
              ? `Screening ${files.length} resume${files.length !== 1 ? 's' : ''}…`
              : `Screen ${files.length || 0} resume${files.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden mt-4">
          <div className="px-6 py-4 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900">Screening Results</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {results.filter(r => r.status === 'success').length} of {results.length} processed successfully
            </p>
          </div>
          <div className="divide-y divide-zinc-100">
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-6 py-3.5">
                {r.status === 'success'
                  ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  : <XCircle    className="w-4 h-4 text-red-400 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 truncate">{r.name}</p>
                  {r.status === 'success'
                    ? <p className="text-xs text-zinc-400">{r.candidateId} · Match: {Math.round((r.match_score || 0) * 100)}%</p>
                    : <p className="text-xs text-red-500">{r.error}</p>}
                </div>
                {r.status === 'success' && (
                  <span className={`text-sm font-bold flex-shrink-0 ${
                    Math.round((r.match_score || 0) * 100) >= 80 ? 'text-emerald-600' :
                    Math.round((r.match_score || 0) * 100) >= 60 ? 'text-amber-600' : 'text-red-500'
                  }`}>
                    {Math.round((r.match_score || 0) * 100)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
