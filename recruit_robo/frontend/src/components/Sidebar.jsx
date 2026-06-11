import { Link, useLocation } from 'react-router-dom'
import {
  Home, Briefcase, Search, Cpu, UserCheck, GitBranch, BarChart2, Database,
  ChevronLeft, ChevronRight, FileText, Calendar,
} from 'lucide-react'
import QlogoAnimated from './QlogoAnimated'

const NAV_GROUPS = [
  [
    { to: '/dashboard', label: 'Home',      icon: Home      },
    { to: '/analytics', label: 'Analytics', icon: BarChart2 },
  ],
  [
    { to: '/jobs',               label: 'Jobs',          icon: Briefcase },
    { to: '/candidates',         label: 'Talent Search', icon: Search    },
    { to: '/candidate-database', label: 'Talent Pool',   icon: Database  },
    {
      to: '/upload', label: 'Resume Scorer', icon: Cpu,
      children: [
        { to: '/interviewers', label: 'Interviewers', icon: UserCheck },
      ],
    },
  ],
  [
    { to: '/pipeline',   label: 'Pipeline',   icon: GitBranch },
    { to: '/interviews', label: 'Interviews', icon: Calendar  },
    { to: '/offers',     label: 'Offers',     icon: FileText  },
  ],
]

export default function Sidebar({ collapsed, onCollapsed, width }) {
  const { pathname }  = useLocation()
  const setCollapsed  = onCollapsed

  return (
    <aside
      className="relative flex flex-col flex-shrink-0 bg-white border-r border-gray-100 shadow-sm"
      style={{ width, transition: 'width 200ms ease' }}
    >
      {/* Logo row */}
      <div className={`flex items-center h-16 border-b border-gray-100 flex-shrink-0 ${collapsed ? 'justify-center px-0' : 'px-4 gap-3'}`}>
        <Link to="/dashboard" className={`flex items-center gap-3 ${collapsed ? '' : 'flex-1 min-w-0'}`}>
          <QlogoAnimated className="w-10 h-10 flex-shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-gray-900 text-sm font-bold leading-tight">Quad Recruit</p>
              <p className="text-gray-400 text-xs leading-tight truncate">AI Recruitment</p>
            </div>
          )}
        </Link>
        {!collapsed && (
          <button onClick={() => setCollapsed(v => !v)}
            title="Collapse"
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-50 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {/* Expand button when collapsed */}
        {collapsed && (
          <button onClick={() => setCollapsed(false)}
            title="Expand"
            className="w-full flex justify-center py-2 mb-2 text-gray-300 hover:text-gray-500 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {gi > 0 && <div className="my-2 border-t border-gray-200" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }} />}

            {group.map(({ to, label, icon: Icon, children }) => {
              const active = to === '/dashboard'
                ? pathname === '/dashboard' || pathname === '/'
                : pathname === to
              return (
                <div key={to}>
                  <Link to={to} title={label}
                    className={`flex items-center gap-3 rounded-xl text-sm font-medium transition-all select-none
                      ${collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'}
                      ${active ? 'text-white shadow-sm' : 'text-gray-400 hover:bg-purple-50 hover:text-purple-600'}`}
                    style={active ? { background: 'linear-gradient(135deg, #49029F, #7c3aed)' } : {}}>
                    <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </Link>

                  {/* Sub-items expanded */}
                  {!collapsed && children?.map(({ to: childTo, label: childLabel, icon: ChildIcon }) => {
                    const childActive = pathname === childTo
                    return (
                      <Link key={childTo} to={childTo}
                        className={`flex items-center gap-3 rounded-xl text-sm font-medium transition-all select-none px-3 py-2.5 ml-2
                          ${childActive ? 'text-white shadow-sm' : 'text-gray-400 hover:bg-purple-50 hover:text-purple-600'}`}
                        style={childActive ? { background: 'linear-gradient(135deg, #49029F, #7c3aed)' } : {}}>
                        <ChildIcon className="w-[18px] h-[18px] flex-shrink-0" />
                        <span className="truncate">{childLabel}</span>
                      </Link>
                    )
                  })}

                  {/* Sub-items collapsed */}
                  {collapsed && children?.map(({ to: childTo, label: childLabel, icon: ChildIcon }) => {
                    const childActive = pathname === childTo
                    return (
                      <Link key={childTo} to={childTo} title={childLabel}
                        className={`flex justify-center py-2.5 rounded-xl transition-all
                          ${childActive ? 'text-white shadow-sm' : 'text-gray-400 hover:bg-purple-50 hover:text-purple-600'}`}
                        style={childActive ? { background: 'linear-gradient(135deg, #49029F, #7c3aed)' } : {}}>
                        <ChildIcon className="w-[18px] h-[18px]" />
                      </Link>
                    )
                  })}
                </div>
              )
            })}
          </div>
        ))}
      </nav>

    </aside>
  )
}
