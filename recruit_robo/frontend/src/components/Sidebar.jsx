import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Briefcase, Users, Cpu,
  ChevronLeft, ChevronRight, LogOut,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Qlogo from '../../logo/Qlogo.svg'

const NAV = [
  { to: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/jobs',       label: 'Jobs',        icon: Briefcase },
  { to: '/candidates', label: 'Candidates',  icon: Users },
  { to: '/upload',     label: 'MCP Testing', icon: Cpu },
]

export default function Sidebar() {
  const { pathname }              = useLocation()
  const navigate                  = useNavigate()
  const { user, logout }          = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  const avatar = user?.name?.charAt(0)?.toUpperCase() || '?'

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside
      className={`relative flex flex-col flex-shrink-0 bg-zinc-900 transition-all duration-300 ease-in-out ${
        collapsed ? 'w-[60px]' : 'w-[240px]'
      }`}
    >
      {/* Logo row + collapse toggle */}
      <div className="flex items-center h-14 px-4 border-b border-white/5 flex-shrink-0 gap-3">
        <Link to="/dashboard" className="flex items-center gap-3 flex-1 min-w-0">
          <img src={Qlogo} alt="Quad Recruit" className="w-7 h-7 object-contain flex-shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold leading-tight">Quad Recruit</p>
              <p className="text-zinc-500 text-xs leading-tight truncate">AI Recruitment</p>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(v => !v)}
          title={collapsed ? 'Expand' : 'Collapse'}
          className="flex-shrink-0 text-zinc-600 hover:text-zinc-300 transition-colors"
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4" />
            : <ChevronLeft  className="w-4 h-4" />
          }
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active =
            to === '/dashboard'
              ? pathname === '/dashboard' || pathname === '/'
              : pathname.startsWith(to)
          return (
            <Link
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-all select-none
                ${collapsed ? 'justify-center px-0 py-2.5 mx-1' : 'px-3 py-2.5'}
                ${active
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
                }`}
            >
              <Icon className="w-[18px] h-[18px] flex-shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User + controls */}
      <div className="flex-shrink-0 border-t border-white/5">
        {/* User row */}
        {!collapsed ? (
          <div className="flex items-center gap-2.5 px-3 py-3">
            <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-zinc-200 text-xs font-medium truncate">{user?.name}</p>
              {user?.email && <p className="text-zinc-500 text-[11px] truncate">{user.email}</p>}
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="text-zinc-500 hover:text-zinc-200 transition-colors p-1 rounded"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            title="Sign out"
            className="w-full flex justify-center py-3 text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}

      </div>
    </aside>
  )
}
