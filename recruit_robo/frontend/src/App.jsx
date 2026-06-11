import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useRef, useState, useCallback, useEffect } from 'react'
import { NotebookPen, X } from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SettingsProvider } from './context/SettingsContext'
import { NotificationsProvider } from './context/NotificationsContext'
import Sidebar          from './components/Sidebar'
import TopBar           from './components/TopBar'
import Login            from './pages/Login'
import Register         from './pages/Register'
import Dashboard        from './pages/Dashboard'
import Jobs             from './pages/Jobs'
import JobDetail        from './pages/JobDetail'
import Candidates       from './pages/Candidates'
import UploadResume     from './pages/UploadResume'
import Interviewers     from './pages/Interviewers'
import Pipeline         from './pages/Pipeline'
import CandidateProfile  from './pages/CandidateProfile'
import Analytics         from './pages/Analytics'
import CandidateDatabase from './pages/CandidateDatabase'
import Profile           from './pages/Profile'
import AdminUsers        from './pages/AdminUsers'
import Offers            from './pages/Offers'
import Interviews        from './pages/Interviews'
import CandidateRespond  from './pages/CandidateRespond'

function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />
  return children
}

// ── Floating Notepad ────────────────────────────────────────────────────────
function NotepadWidget() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(() => localStorage.getItem('rr_notepad') || '')
  const taRef = useRef(null)

  useEffect(() => {
    if (open) setTimeout(() => taRef.current?.focus(), 50)
  }, [open])

  const handleChange = (e) => {
    setText(e.target.value)
    localStorage.setItem('rr_notepad', e.target.value)
  }

  const clear = () => {
    setText('')
    localStorage.removeItem('rr_notepad')
    taRef.current?.focus()
  }

  return (
    <div className="fixed bottom-5 right-0 z-50 flex flex-col items-end gap-3" style={{ pointerEvents: 'none' }}>
      {/* Panel — inset from edge so it's fully visible */}
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-80 flex flex-col overflow-hidden origin-bottom-right transition-all duration-200 mr-3"
        style={{
          height: '380px',
          opacity: open ? 1 : 0,
          transform: open ? 'scale(1)' : 'scale(0.85)',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
          <div className="flex items-center gap-2">
            <NotebookPen className="w-3.5 h-3.5 text-white/80" />
            <span className="text-xs font-semibold text-white">Notes</span>
          </div>
          <div className="flex items-center gap-1">
            {text && (
              <button onClick={clear}
                className="text-white/60 hover:text-white text-[10px] px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors">
                Clear
              </button>
            )}
            <button onClick={() => setOpen(false)}
              className="p-0.5 text-white/60 hover:text-white transition-colors rounded hover:bg-white/10">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Textarea */}
        <textarea
          ref={taRef}
          value={text}
          onChange={handleChange}
          placeholder="Jot down notes, reminders, ideas…"
          className="flex-1 w-full px-4 py-3 text-sm text-gray-700 placeholder:text-gray-300 resize-none focus:outline-none leading-relaxed"
        />

        {/* Footer */}
        <div className="px-4 py-1.5 border-t border-gray-100 bg-gray-50/60 flex-shrink-0">
          <p className="text-[10px] text-gray-400">{text.length} chars · Auto-saved</p>
        </div>
      </div>

      {/* FAB — partially tucked behind right edge, peeks out on hover */}
      <button
        onClick={() => setOpen(v => !v)}
        title={open ? 'Close notepad' : 'Open notepad'}
        className="w-8 h-8 rounded-l-full rounded-r-none text-white shadow-md transition-all duration-200 translate-x-1 hover:translate-x-0 active:scale-95 flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(73, 2, 159, 0.55)', backdropFilter: 'blur(4px)', pointerEvents: 'auto' }}
      >
        <NotebookPen className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

const SIDEBAR_MIN = 160
const SIDEBAR_MAX = 360
const SIDEBAR_DEFAULT = 220
const SIDEBAR_COLLAPSED = 68

function AppShell() {
  const { user } = useAuth()

  const [collapsed, setCollapsed] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('rr_sidebar_w')
    return saved ? Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, parseInt(saved, 10))) : SIDEBAR_DEFAULT
  })

  const dragging    = useRef(false)
  const startX      = useRef(0)
  const startW      = useRef(0)
  const currentW    = useRef(sidebarWidth)

  const onMouseMove = useCallback(e => {
    if (!dragging.current) return
    const next = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, startW.current + e.clientX - startX.current))
    currentW.current = next
    setSidebarWidth(next)
  }, [])

  const onMouseUp = useCallback(() => {
    if (!dragging.current) return
    dragging.current = false
    localStorage.setItem('rr_sidebar_w', currentW.current)
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [onMouseMove])

  function startResize(e) {
    if (collapsed) return
    e.preventDefault()
    dragging.current = true
    startX.current   = e.clientX
    startW.current   = sidebarWidth
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    document.body.style.cursor     = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/respond/:token" element={<CandidateRespond />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*"         element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  const currentWidth = collapsed ? SIDEBAR_COLLAPSED : sidebarWidth

  return (
    <div className="h-screen flex overflow-hidden font-sans">
      <Sidebar collapsed={collapsed} onCollapsed={setCollapsed} width={currentWidth} />

      {/* Resize handle — only visible / active when expanded */}
      <div
        onMouseDown={startResize}
        title="Drag to resize sidebar"
        className={`flex-shrink-0 w-1 transition-colors z-20 ${
          collapsed
            ? 'cursor-default bg-transparent'
            : 'cursor-col-resize hover:bg-purple-400 active:bg-purple-500 bg-gray-100'
        }`}
      />

      <NotepadWidget />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto" style={{ background: 'var(--page-bg)' }}>
          <Routes>
            <Route path="/login"    element={<Navigate to="/dashboard" replace />} />
            <Route path="/register" element={<Navigate to="/dashboard" replace />} />
            <Route path="/"         element={<Navigate to="/dashboard" replace />} />

            <Route path="/dashboard"              element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/jobs"                   element={<PrivateRoute><Jobs /></PrivateRoute>} />
            <Route path="/jobs/:jobId"            element={<PrivateRoute><JobDetail /></PrivateRoute>} />
            <Route path="/candidates"             element={<PrivateRoute><Candidates /></PrivateRoute>} />
            <Route path="/upload"                 element={<PrivateRoute><UploadResume /></PrivateRoute>} />
            <Route path="/interviewers"           element={<PrivateRoute><Interviewers /></PrivateRoute>} />
            <Route path="/pipeline"               element={<PrivateRoute><Pipeline /></PrivateRoute>} />
            <Route path="/candidates/:candidateId" element={<PrivateRoute><CandidateProfile /></PrivateRoute>} />
            <Route path="/analytics"              element={<PrivateRoute><Analytics /></PrivateRoute>} />
            <Route path="/candidate-database"     element={<PrivateRoute><CandidateDatabase /></PrivateRoute>} />
            <Route path="/profile"                element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/offers"                 element={<PrivateRoute><Offers /></PrivateRoute>} />
            <Route path="/interviews"             element={<PrivateRoute><Interviews /></PrivateRoute>} />
            <Route path="/respond/:token"         element={<CandidateRespond />} />
            <Route path="/admin/users"            element={<AdminRoute><AdminUsers /></AdminRoute>} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <NotificationsProvider>
            <AppShell />
          </NotificationsProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
