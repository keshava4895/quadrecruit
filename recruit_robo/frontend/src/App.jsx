import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
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

function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

function AppShell() {
  const { user } = useAuth()

  if (!user) {
    return (
      <Routes>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*"         element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <div className="h-screen flex overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto" style={{ background: '#f1f0f7' }}>
          <Routes>
          <Route path="/login"       element={<Navigate to="/dashboard" replace />} />
          <Route path="/register"    element={<Navigate to="/dashboard" replace />} />
          <Route path="/"            element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"   element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/jobs"        element={<PrivateRoute><Jobs /></PrivateRoute>} />
          <Route path="/jobs/:jobId" element={<PrivateRoute><JobDetail /></PrivateRoute>} />
          <Route path="/candidates"  element={<PrivateRoute><Candidates /></PrivateRoute>} />
          <Route path="/upload"        element={<PrivateRoute><UploadResume /></PrivateRoute>} />
          <Route path="/interviewers" element={<PrivateRoute><Interviewers /></PrivateRoute>} />
          <Route path="/pipeline"                  element={<PrivateRoute><Pipeline /></PrivateRoute>} />
          <Route path="/candidates/:candidateId"   element={<PrivateRoute><CandidateProfile /></PrivateRoute>} />
          <Route path="/analytics"                 element={<PrivateRoute><Analytics /></PrivateRoute>} />
          <Route path="/candidate-database"        element={<PrivateRoute><CandidateDatabase /></PrivateRoute>} />
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
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  )
}
