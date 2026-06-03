import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Sidebar      from './components/Sidebar'
import Header       from './components/Header'
import Login        from './pages/Login'
import Register     from './pages/Register'
import Dashboard    from './pages/Dashboard'
import Jobs         from './pages/Jobs'
import JobDetail    from './pages/JobDetail'
import Candidates   from './pages/Candidates'
import UploadResume from './pages/UploadResume'

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
        <Header />
        <main className="flex-1 overflow-auto bg-zinc-50">
          <Routes>
          <Route path="/login"       element={<Navigate to="/dashboard" replace />} />
          <Route path="/register"    element={<Navigate to="/dashboard" replace />} />
          <Route path="/"            element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"   element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/jobs"        element={<PrivateRoute><Jobs /></PrivateRoute>} />
          <Route path="/jobs/:jobId" element={<PrivateRoute><JobDetail /></PrivateRoute>} />
          <Route path="/candidates"  element={<PrivateRoute><Candidates /></PrivateRoute>} />
          <Route path="/upload"      element={<PrivateRoute><UploadResume /></PrivateRoute>} />
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
