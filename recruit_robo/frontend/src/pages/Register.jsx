import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { User, Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'
import QlogoAnimated from '../components/QlogoAnimated'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../api'

export default function Register() {
  const { login }  = useAuth()
  const navigate   = useNavigate()

  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm)  { setError('Passwords do not match.'); return }

    setLoading(true)
    try {
      const res = await authApi.register({ name: name.trim(), email: email.trim(), password })
      const { access_token, user } = res.data
      login(
        { name: user.name, email: user.email, role: user.role, avatar: user.name.charAt(0).toUpperCase() },
        access_token,
      )
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err?.response?.data?.detail || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const pwStrength = password.length === 0 ? null : password.length < 6 ? 'weak' : password.length < 10 ? 'medium' : 'strong'

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <QlogoAnimated className="w-24 h-24 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-indigo-900">Quad Recruit</h1>
          <p className="text-indigo-500 mt-1 text-sm">AI-Powered Recruitment Platform</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Create account</h2>
          <p className="text-sm text-gray-500 mb-6">Join your team on Quad Recruit</p>

          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Jane Smith"
                  autoComplete="name"
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  autoComplete="new-password"
                  required
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {pwStrength && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  {['weak','medium','strong'].map(level => (
                    <div key={level} className={`h-1 flex-1 rounded-full transition-colors ${
                      pwStrength === 'weak'   && level === 'weak'                                    ? 'bg-red-400'
                      : pwStrength === 'medium' && (level === 'weak' || level === 'medium')         ? 'bg-yellow-400'
                      : pwStrength === 'strong'                                                      ? 'bg-emerald-400'
                      : 'bg-gray-200'
                    }`} />
                  ))}
                  <span className={`text-xs ml-1 ${pwStrength === 'weak' ? 'text-red-500' : pwStrength === 'medium' ? 'text-yellow-600' : 'text-emerald-600'}`}>
                    {pwStrength}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  autoComplete="new-password"
                  required
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                {confirm && password === confirm && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                )}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors shadow-sm">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Create Account</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:underline font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
