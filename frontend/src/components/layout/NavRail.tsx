import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  Video,
  ClipboardList,
  BarChart2,
  Settings,
  Fingerprint
} from 'lucide-react'
import { useAuth } from '../../lib/auth'

export const NavRail: React.FC = () => {
  const { user } = useAuth()
  const isTeacher = user?.role === 'teacher'

  return (
    <aside className="w-60 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700/80 flex flex-col h-full min-h-screen">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700/60">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
            {isTeacher ? 'Teacher Navigation' : 'Admin Navigation'}
          </span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {/* Admin Dashboard */}
        {!isTeacher && (
          <NavLink
            to="/"
            end
            className={({ isActive }) => `
              flex items-center px-3 py-2.5 text-xs font-semibold rounded-xl transition-all
              ${
                isActive
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }
            `}
          >
            <LayoutDashboard className="w-4 h-4 mr-3" />
            <span>Admin Dashboard</span>
          </NavLink>
        )}

        {/* Teacher Workspace Link */}
        <NavLink
          to="/teacher"
          end
          className={({ isActive }) => `
            flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-xl transition-all
            ${
              isActive
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }
          `}
        >
          <div className="flex items-center">
            <GraduationCap className="w-4 h-4 mr-3 text-emerald-500" />
            <span>Teacher Portal</span>
          </div>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 px-1.5 py-0.5 rounded font-mono">
            New
          </span>
        </NavLink>

        {/* Live Attendance */}
        <NavLink
          to="/live"
          end
          className={({ isActive }) => `
            flex items-center px-3 py-2.5 text-xs font-semibold rounded-xl transition-all
            ${
              isActive
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }
          `}
        >
          <Video className="w-4 h-4 mr-3" />
          <span>Live Camera Station</span>
        </NavLink>

        {/* Students & Biometrics */}
        <NavLink
          to="/students"
          end
          className={({ isActive }) => `
            flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-xl transition-all
            ${
              isActive
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }
          `}
        >
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-3" />
            <span>Students & Biometrics</span>
          </div>
          <Fingerprint className="w-3.5 h-3.5 text-primary-500" />
        </NavLink>

        {/* Attendance Records */}
        <NavLink
          to="/records"
          end
          className={({ isActive }) => `
            flex items-center px-3 py-2.5 text-xs font-semibold rounded-xl transition-all
            ${
              isActive
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }
          `}
        >
          <ClipboardList className="w-4 h-4 mr-3" />
          <span>Attendance Records</span>
        </NavLink>

        {/* Reports */}
        <NavLink
          to="/reports"
          end
          className={({ isActive }) => `
            flex items-center px-3 py-2.5 text-xs font-semibold rounded-xl transition-all
            ${
              isActive
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }
          `}
        >
          <BarChart2 className="w-4 h-4 mr-3" />
          <span>Analytics & Reports</span>
        </NavLink>

        {/* System Settings - for admin */}
        {!isTeacher && (
          <NavLink
            to="/settings"
            end
            className={({ isActive }) => `
              flex items-center px-3 py-2.5 text-xs font-semibold rounded-xl transition-all
              ${
                isActive
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }
            `}
          >
            <Settings className="w-4 h-4 mr-3" />
            <span>Hardware & Settings</span>
          </NavLink>
        )}
      </nav>

      {/* Footer system status */}
      <div className="p-3 border-t border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/40 m-2 rounded-xl">
        <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Face Engine</p>
        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">Profile: Laptop / Pi3 ready</p>
      </div>
    </aside>
  )
}