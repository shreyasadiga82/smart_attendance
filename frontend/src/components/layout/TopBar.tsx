import React from 'react'
import { useAuth } from '../../lib/auth'
import { useTheme } from '../../hooks/useTheme'
import { Sun, Moon, Shield, GraduationCap, ArrowLeftRight, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export const TopBar: React.FC = () => {
  const { user, logout, switchRole } = useAuth()
  const { isDarkMode, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const isTeacher = user?.role === 'teacher'

  const handleToggleRole = () => {
    if (isTeacher) {
      switchRole('admin')
      navigate('/')
    } else {
      switchRole('teacher')
      navigate('/teacher')
    }
  }

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700/80 px-4 py-2.5 sm:px-6 shadow-xs">
      <div className="flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            SA
          </div>
          <div>
            <span className="text-base font-bold text-gray-900 dark:text-gray-100 leading-tight">
              Smart Attendance
            </span>
            <div className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] text-gray-400 font-medium tracking-tight">System Online</span>
            </div>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center space-x-3">
          {/* Role badge and fast switcher */}
          <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700/60 p-1 rounded-xl">
            <span
              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                isTeacher
                  ? 'bg-emerald-500 text-white shadow-2xs'
                  : 'bg-primary-600 text-white shadow-2xs'
              }`}
            >
              {isTeacher ? (
                <>
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Teacher Portal</span>
                </>
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin Section</span>
                </>
              )}
            </span>

            <button
              onClick={handleToggleRole}
              className="text-[11px] text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-gray-600 font-medium flex items-center space-x-1 transition-all"
              title={isTeacher ? 'Switch to Admin Section' : 'Switch to Teacher Portal'}
            >
              <ArrowLeftRight className="w-3 h-3" />
              <span className="hidden sm:inline">
                {isTeacher ? 'Switch to Admin' : 'Switch to Teacher'}
              </span>
            </button>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Profile */}
          <div className="flex items-center space-x-2 pl-2 border-l border-gray-200 dark:border-gray-700">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-700 to-gray-900 text-white font-semibold text-xs flex items-center justify-center shadow-xs">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-none">
                {user?.username}
              </p>
              <p className="text-[10px] text-gray-400 leading-none mt-0.5 capitalize">
                {user?.role}
              </p>
            </div>

            <button
              onClick={logout}
              className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}