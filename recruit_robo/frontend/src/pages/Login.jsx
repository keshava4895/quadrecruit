import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Lock, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react'
import QlogoAnimated from '../components/QlogoAnimated'
import { useAuth } from '../context/AuthContext'

const HARDCODED_PASSWORD = 'password'

export default function Login() {
  const { login }  = useAuth()
  const navigate   = useNavigate()

  const [identifier, setIdentifier] = useState('')
  const [password,   setPassword]   = useState('')
  const [showPw,     setShowPw]     = useState(false)
  const [error,      setError]      = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const trimId = identifier.trim()

    if (!trimId) {
      setError('Please enter your username or email.')
      return
    }
    if (!password) {
      setError('Please enter your password.')
      return
    }
    if (password !== HARDCODED_PASSWORD) {
      setError('Incorrect password. Please try again.')
      return
    }

    const isEmail     = trimId.includes('@')
    const displayName = isEmail ? trimId.split('@')[0] : trimId
    const email       = isEmail ? trimId : ''
    const avatar      = displayName.charAt(0).toUpperCase()

    login({ name: displayName, email, avatar })
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo block */}
        <div className="text-center mb-8">
          <QlogoAnimated className="w-24 h-24 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-indigo-900">Quad Recruit</h1>
          <p className="text-indigo-500 mt-1 text-sm">AI-Powered Recruitment Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-6">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Username / Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="Enter username or email"
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-sm"
            >
              Sign In
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        <p className="text-center text-indigo-400 text-xs mt-6">
          Internal recruitment tool &mdash; authorized users only
        </p>
      </div>
    </div>
  )
}
