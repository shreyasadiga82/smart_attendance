import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Video,
  ClipboardList,
  BarChart2,
  Settings,
  LogIn
} from 'lucide-react'

export const NavRail = () => {
  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      <nav className="px-2 pt-4 pb-2 space-y-1">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `
            flex items-center px-3 py-2 text-sm font-medium rounded-md
            ${isActive ? 'bg-primary-500 text-primary-100' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}
          `}
        >
          <LayoutDashboard className="w-5 h-5 mr-3" />
          Dashboard
        </NavLink>

        <NavLink
          to="/live"
          end
          className={({ isActive }) => `
            flex items-center px-3 py-2 text-sm font-medium rounded-md
            ${isActive ? 'bg-primary-500 text-primary-100' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}
          `}
        >
          <Video className="w-5 h-5 mr-3" />
          Live Attendance
        </NavLink>

        <NavLink
          to="/students"
          end
          className={({ isActive }) => `
            flex items-center px-3 py-2 text-sm font-medium rounded-md
            ${isActive ? 'bg-primary-500 text-primary-100' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}
          `}
        >
          <Users className="w-5 h-5 mr-3" />
          Students
        </NavLink>

        <NavLink
          to="/records"
          end
          className={({ isActive }) => `
            flex items-center px-3 py-2 text-sm font-medium rounded-md
            ${isActive ? 'bg-primary-500 text-primary-100' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}
          `}
        >
          <ClipboardList className="w-5 h-5 mr-3" />
          Records
        </NavLink>

        <NavLink
          to="/reports"
          end
          className={({ isActive }) => `
            flex items-center px-3 py-2 text-sm font-medium rounded-md
            ${isActive ? 'bg-primary-500 text-primary-100' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}
          `}
        >
          <BarChart2 className="w-5 h-5 mr-3" />
          Reports
        </NavLink>

        <NavLink
          to="/settings"
          end
          className={({ isActive }) => `
            flex items-center px-3 py-2 text-sm font-medium rounded-md
            ${isActive ? 'bg-primary-500 text-primary-100' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}
          `}
        >
          <Settings className="w-5 h-5 mr-3" />
          Settings
        </NavLink>

        {/* Add a divider and login/logout at the bottom */}
        <div className="my-4 h-px bg-gray-200 dark:bg-gray-700"></div>
        <NavLink
          to="/login"
          end
          className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <LogIn className="w-5 h-5 mr-3" />
          Logout
        </NavLink>
      </nav>
    </div>
  )
}