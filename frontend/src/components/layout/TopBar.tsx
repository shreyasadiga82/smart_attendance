import React from 'react'
import { useAuth } from '../../lib/auth'
import { useTheme } from '../../hooks/useTheme'
import { Sun, Moon } from 'lucide-react'

export const TopBar = () => {
  const { user } = useAuth()
  const { isDarkMode, toggleTheme } = useTheme()

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm px-4 py-3 sm:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            Smart Attendance
          </span>
        </div>
        <div className="flex items-center space-x-4">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-gray-500" />}
          </button>
          {/* User profile */}
          <div className="relative">
            <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
              {user?.name?.charAt(0) ?? 'A'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}