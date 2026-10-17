import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  Home,
  Video,
  Users,
  ClipboardList,
  BarChart2,
  Settings
} from 'lucide-react'

export const BottomNav = () => {
  return (
    <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="flex justify-around px-2 py-3">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `
            flex flex-col items-center gap-1
            ${isActive ? 'text-primary-500' : 'text-gray-400 dark:text-gray-500'}
          `}
        >
          <Home className="w-5 h-5" />
          <span className="text-xs">Home</span>
        </NavLink>

        <NavLink
          to="/live"
          end
          className={({ isActive }) => `
            flex flex-col items-center gap-1
            ${isActive ? 'text-primary-500' : 'text-gray-400 dark:text-gray-500'}
          `}
        >
          <Video className="w-5 h-5" />
          <span className="text-xs">Live</span>
        </NavLink>

        <NavLink
          to="/students"
          end
          className={({ isActive }) => `
            flex flex-col items-center gap-1
            ${isActive ? 'text-primary-500' : 'text-gray-400 dark:text-gray-500'}
          `}
        >
          <Users className="w-5 h-5" />
          <span className="text-xs">Students</span>
        </NavLink>

        <NavLink
          to="/reports"
          end
          className={({ isActive }) => `
            flex flex-col items-center gap-1
            ${isActive ? 'text-primary-500' : 'text-gray-400 dark:text-gray-500'}
          `}
        >
          <BarChart2 className="w-5 h-5" />
          <span className="text-xs">Reports</span>
        </NavLink>

        <NavLink
          to="/settings"
          end
          className={({ isActive }) => `
            flex flex-col items-center gap-1
            ${isActive ? 'text-primary-500' : 'text-gray-400 dark:text-gray-500'}
          `}
        >
          <Settings className="w-5 h-5" />
          <span className="text-xs">Settings</span>
        </NavLink>
      </div>
    </div>
  )
}