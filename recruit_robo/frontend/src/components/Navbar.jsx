import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Briefcase, Users, Upload } from 'lucide-react'

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/jobs',      label: 'Jobs',      icon: Briefcase },
  { to: '/candidates',label: 'Candidates',icon: Users },
  { to: '/upload',    label: 'Upload',    icon: Upload },
]

export default function Navbar() {
  const { pathname } = useLocation()
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center h-14 gap-8">
        <Link to="/dashboard" className="flex items-center gap-2 font-semibold text-indigo-600">
          <span className="text-xl">🤖</span>
          <span>Quad Recruit</span>
        </Link>
        <div className="flex items-center gap-1 ml-4">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${pathname.startsWith(to)
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </div>
        <div className="ml-auto text-xs text-gray-400">AI-Powered Recruitment</div>
      </div>
    </nav>
  )
}
