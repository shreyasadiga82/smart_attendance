import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  Home,
  GraduationCap,
  Video,
  Users,
  ClipboardList
} from 'lucide-react'

export const BottomNav: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700/80 fixed bottom-0 left-0 right-0 z-30 shadow-lg">
      <div className="flex justify-around px-2 py-2">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `
            flex flex-col items-center gap-1 py-1 px-2 rounded-lg transition-colors
            ${isActive ? 'text-primary-600 font-semibold' : 'text-gray-500 hover:text-gray-700'}
          `}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">Admin</span>
        </NavLink>

        <NavLink
          to="/teacher"
          end
          className={({ isActive }) => `
            flex flex-col items-center gap-1 py-1 px-2 rounded-lg transition-colors
            ${isActive ? 'text-emerald-600 font-semibold' : 'text-gray-500 hover:text-gray-700'}
          `}
        >
          <GraduationCap className="w-5 h-5" />
          <span className="text-[10px]">Teacher</span>
        </NavLink>

        <NavLink
          to="/live"
          end
          className={({ isActive }) => `
            flex flex-col items-center gap-1 py-1 px-2 rounded-lg transition-colors
            ${isActive ? 'text-primary-600 font-semibold' : 'text-gray-500 hover:text-gray-700'}
          `}
        >
          <Video className="w-5 h-5" />
          <span className="text-[10px]">Camera</span>
        </NavLink>

        <NavLink
          to="/students"
          end
          className={({ isActive }) => `
            flex flex-col items-center gap-1 py-1 px-2 rounded-lg transition-colors
            ${isActive ? 'text-primary-600 font-semibold' : 'text-gray-500 hover:text-gray-700'}
          `}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px]">Students</span>
        </NavLink>

        <NavLink
          to="/records"
          end
          className={({ isActive }) => `
            flex flex-col items-center gap-1 py-1 px-2 rounded-lg transition-colors
            ${isActive ? 'text-primary-600 font-semibold' : 'text-gray-500 hover:text-gray-700'}
          `}
        >
          <ClipboardList className="w-5 h-5" />
          <span className="text-[10px]">Records</span>
        </NavLink>
      </div>
    </div>
  )
}