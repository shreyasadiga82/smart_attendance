import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { TeacherDashboard } from './pages/TeacherDashboard'
import { LiveAttendance } from './pages/LiveAttendance'
import { EnrollStudent } from './pages/EnrollStudent'
import { Students } from './pages/Students'
import { Records } from './pages/Records'
import { Reports } from './pages/Reports'
import { Settings } from './pages/Settings'
import { AppShell } from './components/layout/AppShell'
import { NavRail } from './components/layout/NavRail'
import { BottomNav } from './components/layout/BottomNav'
import { useAuth } from './lib/auth'

function App() {
  const { user } = useAuth()
  const location = useLocation()

  // Unauthenticated routes
  if (!user) {
    if (location.pathname !== '/login') {
      return <Navigate to="/login" replace />
    }
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  // Authenticated routes
  return (
    <AppShell>
      {/* Navigation - Rail for desktop, Bottom for mobile */}
      <nav className="hidden md:block">
        <NavRail />
      </nav>
      <nav className="md:hidden">
        <BottomNav />
      </nav>

      {/* Page content */}
      <main className="flex-1 overflow-x-hidden pb-16 md:pb-6">
        <Routes>
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route
            path="/"
            element={user.role === 'teacher' ? <TeacherDashboard /> : <Dashboard />}
          />
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/live" element={<LiveAttendance />} />
          <Route path="/enroll" element={<EnrollStudent />} />
          <Route path="/students" element={<Students />} />
          <Route path="/records" element={<Records />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </AppShell>
  )
}

export default App