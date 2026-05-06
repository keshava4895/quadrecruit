import { useState, useRef, useEffect } from 'react'
import { LogOut, ChevronDown } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import QlogoAnimated from './QlogoAnimated'

export default function Header() {
  const { user, logout } = useAuth()
  const navigate         = useNavigate()
  const [open, setOpen]  = useState(false)
  const dropdownRef      = useRef(null)

  const avatar = user?.avatar || user?.name?.charAt(0)?.toUpperCase() || '?'

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleLogout() {
    setOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="h-16 bg-blue-600 flex items-center justify-between px-6 flex-shrink-0 z-50 shadow-sm">
      {/* Logo */}
      <Link to="/dashboard" className="flex items-center gap-3">
        <QlogoAnimated className="w-12 h-12 flex-shrink-0" />
        <div className="leading-tight">
          <div className="text-white font-bold text-sm">Quad Recruit</div>
          <div className="text-blue-200 text-xs">AI-Powered Recruitment Platform</div>
        </div>
      </Link>

      {/* User avatar with dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 hover:bg-white/10 rounded-lg px-2 py-1.5 transition-colors"
        >
          <div className="text-right leading-tight">
            <div className="text-white text-sm font-medium">{user?.name || '—'}</div>
            {user?.email && (
              <div className="text-blue-200 text-xs">{user.email}</div>
            )}
          </div>
          <div className="w-8 h-8 bg-white/25 rounded-full flex items-center justify-center text-white text-sm font-semibold select-none">
            {avatar}
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-blue-200 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
            <div className="px-4 py-2.5 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
              {user?.email && (
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
