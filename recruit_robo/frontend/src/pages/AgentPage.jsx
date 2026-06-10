import { useState, useEffect } from 'react'
import { Bot, Play, Save, Settings2, RotateCcw, CheckCircle2, Circle } from 'lucide-react'
import { jobsApi } from '../api'

const DEFAULT_SYSTEM_PROMPT = `You are Quad Recruit Agent, an AI recruitment assistant for Quadrant Technologies.

Your goal is to autonomously source, evaluate, and shortlist candidates for open positions.

Guidelines:
- Always search across multiple portals to maximise candidate coverage
- Shortlist candidates with a match score of 75% or above
- Write personalised outreach emails that highlight relevant experience
- Be professional, concise, and accurate in all communications
- Respect candidate privacy and company hiring policies`

const TOOLS = [
  { key: 'search',    label: 'Search Candidates',      desc: 'Search portals for matching candidates' },
  { key: 'score',     label: 'Score & Shortlist',       desc: 'Rank candidates against job requirements' },
  { key: 'pipeline',  label: 'Add to Pipeline',         desc: 'Save shortlisted candidates automatically' },
  { key: 'email',     label: 'Send Outreach Emails',    desc: 'Email top candidates on your behalf' },
  { key: 'schedule',  label: 'Schedule Interviews',     desc: 'Book calendar slots automatically' },
]

const PORTALS = [
  { key: 'linkedin',  label: 'LinkedIn' },
  { key: 'naukri',    label: 'Naukri Resdex' },
  { key: 'zoho',      label: 'Zoho Recruit' },
  { key: 'github',    label: 'GitHub' },
]

export default function AgentPage() {
  const [tab, setTab]                   = useState('config')
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT)
  const [enabledTools, setEnabledTools] = useState({ search: true, score: true, pipeline: true, email: false, schedule: false })
  const [enabledPortals, setEnabledPortals] = useState({ linkedin: true, naukri: true, zoho: false, github: false })
  const [saved, setSaved]               = useState(false)

  const [jobs, setJobs]           = useState([])
  const [selectedJob, setSelectedJob] = useState('')
  const [taskPrompt, setTaskPrompt]   = useState('')
  const [running, setRunning]         = useState(false)
  const [logs, setLogs]               = useState([])

  useEffect(() => {
    jobsApi.list().then(r => setJobs(r.data || [])).catch(() => {})
  }, [])

  function toggleTool(key) {
    setEnabledTools(prev => ({ ...prev, [key]: !prev[key] }))
    setSaved(false)
  }

  function togglePortal(key) {
    setEnabledPortals(prev => ({ ...prev, [key]: !prev[key] }))
    setSaved(false)
  }

  function handleSaveConfig() {
    // Config saved locally for now — backend agent service coming soon
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function handleRun() {
    if (!selectedJob && !taskPrompt.trim()) return
    setRunning(true)
    setLogs([
      { type: 'info',    text: 'Agent backend is being set up — coming soon.' },
      { type: 'info',    text: 'Configuration saved. Agent will use these settings when launched.' },
    ])
    setTimeout(() => setRunning(false), 1500)
  }

  const job = jobs.find(j => j.jobId === selectedJob)

  return (
    <div className="h-full flex flex-col bg-zinc-50">

      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-zinc-200 px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-zinc-900">Quad Recruit Agent</h1>
            <p className="text-sm text-zinc-500">Configure and run your AI recruitment automation</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 mt-5 border-b border-zinc-100 -mb-5">
          {[
            { key: 'config', label: 'Configuration', icon: Settings2 },
            { key: 'run',    label: 'Run Agent',      icon: Play },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? 'border-violet-600 text-violet-600'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700'
              }`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto px-8 py-6">

        {/* ── Configuration Tab ── */}
        {tab === 'config' && (
          <div className="max-w-2xl space-y-6">

            {/* System Prompt */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-6">
              <h2 className="text-sm font-semibold text-zinc-800 mb-1">System Prompt</h2>
              <p className="text-xs text-zinc-500 mb-3">Define the agent's personality, rules, and behaviour. This is applied to every run.</p>
              <textarea
                rows={10}
                value={systemPrompt}
                onChange={e => { setSystemPrompt(e.target.value); setSaved(false) }}
                className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-800 bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none font-mono leading-relaxed"
              />
              <button onClick={() => { setSystemPrompt(DEFAULT_SYSTEM_PROMPT); setSaved(false) }}
                className="mt-2 flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
                <RotateCcw className="w-3 h-3" /> Reset to default
              </button>
            </div>

            {/* Tool Permissions */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-6">
              <h2 className="text-sm font-semibold text-zinc-800 mb-1">Tool Permissions</h2>
              <p className="text-xs text-zinc-500 mb-4">Choose which actions the agent is allowed to take autonomously.</p>
              <div className="space-y-3">
                {TOOLS.map(({ key, label, desc }) => (
                  <div key={key} onClick={() => toggleTool(key)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-zinc-100 hover:border-violet-200 hover:bg-violet-50/30 cursor-pointer transition-all">
                    {enabledTools[key]
                      ? <CheckCircle2 className="w-5 h-5 text-violet-600 flex-shrink-0" />
                      : <Circle className="w-5 h-5 text-zinc-300 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-800">{label}</p>
                      <p className="text-xs text-zinc-400">{desc}</p>
                    </div>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      enabledTools[key] ? 'bg-violet-100 text-violet-700' : 'bg-zinc-100 text-zinc-400'
                    }`}>
                      {enabledTools[key] ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Portals */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-6">
              <h2 className="text-sm font-semibold text-zinc-800 mb-1">Search Portals</h2>
              <p className="text-xs text-zinc-500 mb-4">Select which portals the agent will search during a run.</p>
              <div className="grid grid-cols-2 gap-3">
                {PORTALS.map(({ key, label }) => (
                  <div key={key} onClick={() => togglePortal(key)}
                    className="flex items-center gap-2.5 p-3 rounded-xl border border-zinc-100 hover:border-violet-200 hover:bg-violet-50/30 cursor-pointer transition-all">
                    {enabledPortals[key]
                      ? <CheckCircle2 className="w-4 h-4 text-violet-600 flex-shrink-0" />
                      : <Circle className="w-4 h-4 text-zinc-300 flex-shrink-0" />}
                    <span className="text-sm font-medium text-zinc-700">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Save */}
            <button onClick={handleSaveConfig}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition-colors">
              {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? 'Saved!' : 'Save Configuration'}
            </button>
          </div>
        )}

        {/* ── Run Agent Tab ── */}
        {tab === 'run' && (
          <div className="max-w-2xl space-y-6">

            {/* Coming soon banner */}
            <div className="bg-violet-50 border border-violet-200 rounded-2xl px-5 py-4 flex items-start gap-3">
              <Bot className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-violet-800">Agent backend coming soon</p>
                <p className="text-xs text-violet-600 mt-0.5">
                  Configure the agent above and save. The backend service is being built —
                  once ready, you'll trigger full automated recruitment runs from here.
                </p>
              </div>
            </div>

            {/* Job selector */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Select Job</label>
                <select value={selectedJob} onChange={e => setSelectedJob(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="">— Choose a job —</option>
                  {jobs.map(j => (
                    <option key={j.jobId} value={j.jobId}>{j.title}</option>
                  ))}
                </select>
                {job && (
                  <p className="mt-1.5 text-xs text-zinc-400">
                    {job.location && `📍 ${job.location} · `}{job.experience_years}+ yrs · {(job.skills || []).slice(0, 4).join(', ')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Task Instructions</label>
                <textarea rows={4} value={taskPrompt} onChange={e => setTaskPrompt(e.target.value)}
                  placeholder="e.g. Find 10 Python developers in Bangalore, shortlist those above 80% match, and email the top 5"
                  className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-800 bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
              </div>

              <button onClick={handleRun}
                disabled={running || (!selectedJob && !taskPrompt.trim())}
                className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors">
                <Play className="w-4 h-4" />
                {running ? 'Starting…' : 'Run Agent'}
              </button>
            </div>

            {/* Logs */}
            {logs.length > 0 && (
              <div className="bg-zinc-900 rounded-2xl p-5">
                <p className="text-xs font-semibold text-zinc-400 mb-3 uppercase tracking-wide">Agent Output</p>
                <div className="space-y-2">
                  {logs.map((log, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className={`text-xs font-mono mt-0.5 ${log.type === 'error' ? 'text-red-400' : 'text-violet-400'}`}>›</span>
                      <p className="text-xs text-zinc-300 font-mono leading-relaxed">{log.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
