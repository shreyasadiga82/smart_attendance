import React, { useState, useEffect } from 'react'
import { useAuth } from '../../lib/auth'
import { useTheme } from '../../hooks/useTheme'
import { Sun, Moon, Shield, GraduationCap, LogOut, Clock, Calendar } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export const TopBar: React.FC = () => {
  const { user, logout } = useAuth()
  const { isDarkMode, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [now, setNow] = useState(new Date())

  const isTeacher = user?.role === 'teacher'

  // Live clock updating every second
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formattedDate = now.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  const formattedTime = now.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="bg-white dark:bg-gray-850 border-b border-gray-200 dark:border-gray-800 px-4 py-2.5 sm:px-6 shadow-xs sticky top-0 z-20">
      <div className="flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            SA
          </div>
          <div>
            <span className="text-base font-bold text-gray-900 dark:text-gray-100 leading-tight">
              Smart Attendance
            </span>
            <div className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] text-gray-400 font-medium">Eye Sensor & Biometrics Online</span>
            </div>
          </div>
        </div>

        {/* Live Date & Time Center Pill */}
        <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-gray-100/90 dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700/80 rounded-xl text-xs shadow-2xs">
          <Calendar className="w-3.5 h-3.5 text-primary-500" />
          <span className="font-medium text-gray-700 dark:text-gray-200">
            {formattedDate}
          </span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <Clock className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {formattedTime}
          </span>
        </div>

        {/* Right side controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Mobile date badge */}
          <div className="sm:hidden flex items-center text-[10px] font-mono px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-emerald-600 dark:text-emerald-400 font-semibold">
            {formattedTime}
          </div>

          {/* Real Authenticated Role Badge */}
          <div className="flex items-center">
            <span
              className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                isTeacher
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                  : 'bg-primary-500/15 text-primary-700 dark:text-primary-300 border border-primary-500/30'
              }`}
            >
              {isTeacher ? (
                <>
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Teacher</span>
                </>
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5 text-primary-500" />
                  <span>Admin</span>
                </>
              )}
            </span>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Profile & Logout */}
          <div className="flex items-center space-x-2 pl-2 border-l border-gray-200 dark:border-gray-800">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-700 to-gray-900 text-white font-semibold text-xs flex items-center justify-center shadow-xs">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="hidden md:block text-left mr-2">
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-none">
                {user?.username}
              </p>
              <p className="text-[10px] text-gray-400 leading-none mt-0.5 capitalize">
                {user?.role}
              </p>
            </div>
            <button
              id="topbar-signout-btn"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-white hover:bg-rose-600 dark:text-rose-400 dark:hover:bg-rose-600 rounded-xl transition-all border border-rose-200 dark:border-rose-900/50 shadow-2xs"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}