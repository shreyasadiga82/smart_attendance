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
    <aside className="w-60 bg-white dark:bg-gray-850 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full min-h-screen">
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {isTeacher ? 'Teacher Navigation' : 'Admin Navigation'}
          </span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {/* ==================== TEACHER NAVIGATION ==================== */}
        {isTeacher ? (
          <>
            <NavLink
              to="/"
              end
              className={({ isActive }) => `
                flex items-center px-3 py-2.5 text-xs font-semibold rounded-xl transition-all
                ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
            >
              <GraduationCap className="w-4 h-4 mr-3 text-emerald-300" />
              <span>Teacher Dashboard</span>
            </NavLink>

            <NavLink
              to="/live"
              end
              className={({ isActive }) => `
                flex items-center px-3 py-2.5 text-xs font-semibold rounded-xl transition-all
                ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
            >
              <Video className="w-4 h-4 mr-3" />
              <span>Attendance Camera</span>
            </NavLink>

            <NavLink
              to="/records"
              end
              className={({ isActive }) => `
                flex items-center px-3 py-2.5 text-xs font-semibold rounded-xl transition-all
                ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
            >
              <ClipboardList className="w-4 h-4 mr-3" />
              <span>Class Attendance Log</span>
            </NavLink>

            <NavLink
              to="/students"
              end
              className={({ isActive }) => `
                flex items-center px-3 py-2.5 text-xs font-semibold rounded-xl transition-all
                ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
            >
              <Users className="w-4 h-4 mr-3" />
              <span>Student Roster</span>
            </NavLink>
          </>
        ) : (
          /* ==================== ADMIN NAVIGATION ==================== */
          <>
            <NavLink
              to="/"
              end
              className={({ isActive }) => `
                flex items-center px-3 py-2.5 text-xs font-semibold rounded-xl transition-all
                ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
            >
              <LayoutDashboard className="w-4 h-4 mr-3" />
              <span>Admin Dashboard</span>
            </NavLink>

            <NavLink
              to="/live"
              end
              className={({ isActive }) => `
                flex items-center px-3 py-2.5 text-xs font-semibold rounded-xl transition-all
                ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
            >
              <Video className="w-4 h-4 mr-3" />
              <span>Live Camera Station</span>
            </NavLink>

            <NavLink
              to="/students"
              end
              className={({ isActive }) => `
                flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-xl transition-all
                ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
            >
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-3" />
                <span>Students & Biometrics</span>
              </div>
              <Fingerprint className="w-3.5 h-3.5 text-primary-400" />
            </NavLink>

            <NavLink
              to="/records"
              end
              className={({ isActive }) => `
                flex items-center px-3 py-2.5 text-xs font-semibold rounded-xl transition-all
                ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
            >
              <ClipboardList className="w-4 h-4 mr-3" />
              <span>Attendance Records</span>
            </NavLink>

            <NavLink
              to="/reports"
              end
              className={({ isActive }) => `
                flex items-center px-3 py-2.5 text-xs font-semibold rounded-xl transition-all
                ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
            >
              <BarChart2 className="w-4 h-4 mr-3" />
              <span>Analytics & Reports</span>
            </NavLink>

            <NavLink
              to="/settings"
              end
              className={({ isActive }) => `
                flex items-center px-3 py-2.5 text-xs font-semibold rounded-xl transition-all
                ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
            >
              <Settings className="w-4 h-4 mr-3" />
              <span>Hardware & Settings</span>
            </NavLink>
          </>
        )}
      </nav>

      {/* Footer system status */}
      <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/40 m-2 rounded-xl">
        <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Face & Eye Sensor</p>
        <p className="text-[10px] text-emerald-500 font-mono">Active & Operational</p>
      </div>
    </aside>
  )
}