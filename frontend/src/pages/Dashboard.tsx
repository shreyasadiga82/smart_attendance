import React, { useEffect, useState } from 'react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { AttendanceTrend } from '../components/charts/AttendanceTrend'
import { SessionDonut } from '../components/charts/SessionDonut'
import { EmptyState } from '../components/ui/EmptyState'
import { Avatar } from '../components/ui/Avatar'
import { apiRequest } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import {
  Video,
  UserPlus,
  Users,
  BarChart2,
  Settings,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Sparkles
} from 'lucide-react'

interface DashboardData {
  stats: {
    present_count: number
    absent_count: number
    attendance_percentage: number
    current_session: string | null
    morning_present: number
    afternoon_present: number
  }
  trend_data: {
    date: string
    present: number
    percentage: number
  }[]
  session_donut_data: {
    name: string
    value: number
  }[]
  recent_activity: {
    id: number
    student_name: string
    roll_no: string
    timestamp: string
    session: string
    status: string
  }[]
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(new Date())

  // Keep live time updated
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const data = await apiRequest<DashboardData>('/dashboard/')
        setDashboardData(data)
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const formattedDate = now.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const formattedTime = now.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-xl w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="h-28 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
            <div className="h-28 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
            <div className="h-28 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
            <div className="h-28 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
          </div>
          <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-2xl p-6">
          <h3 className="font-bold text-base flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Dashboard Loading Error
          </h3>
          <p className="mt-1 text-sm">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Retry Connection
          </Button>
        </div>
      </div>
    )
  }

  const { stats, trend_data, session_donut_data, recent_activity } = dashboardData!
  const totalStudents = stats.present_count + stats.absent_count

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Executive Header with Live Date and Time */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-primary-900/40 via-indigo-900/30 to-purple-900/20 border border-primary-500/20 rounded-2xl p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-primary-500/20 text-primary-300 border border-primary-500/30">
              Admin Workspace
            </span>
            <span className="text-xs text-gray-400">• Institutional Overview</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Administrator Dashboard
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Real-time biometric attendance monitoring and institutional analytics
          </p>
        </div>

        {/* Live Date and Time Widget */}
        <div className="flex items-center gap-3 bg-white/80 dark:bg-gray-800/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs">
          <div className="flex items-center gap-2 pr-3 border-r border-gray-200 dark:border-gray-700">
            <Calendar className="w-4 h-4 text-primary-500" />
            <div className="text-left">
              <p className="text-[10px] uppercase font-semibold text-gray-400 leading-none">Date</p>
              <p className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-tight mt-0.5">
                {formattedDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-500 animate-pulse" />
            <div className="text-left">
              <p className="text-[10px] uppercase font-semibold text-gray-400 leading-none">Live Time</p>
              <p className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 leading-tight mt-0.5">
                {formattedTime}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Present Today */}
        <Card className="p-5 relative overflow-hidden border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Present Today
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
              {stats.present_count}
            </span>
            <span className="text-xs text-gray-400 font-medium">/ {totalStudents} enrolled</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <span>Morning: {stats.morning_present}</span>
            <span>•</span>
            <span>Afternoon: {stats.afternoon_present}</span>
          </div>
        </Card>

        {/* Absent Students */}
        <Card className="p-5 relative overflow-hidden border-rose-500/30 bg-gradient-to-br from-rose-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Absent Today
            </span>
            <div className="p-2 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
              {stats.absent_count}
            </span>
            <span className="text-xs text-gray-400 font-medium">unmarked</span>
          </div>
          <div className="mt-2 text-[11px] text-gray-500 font-medium">
            Requires follow-up notification
          </div>
        </Card>

        {/* Overall Attendance Rate */}
        <Card className="p-5 relative overflow-hidden border-primary-500/30 bg-gradient-to-br from-primary-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Attendance Rate
            </span>
            <div className="p-2 rounded-xl bg-primary-500/15 text-primary-600 dark:text-primary-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-primary-600 dark:text-primary-400">
              {stats.attendance_percentage}%
            </span>
          </div>
          <div className="mt-2 text-[11px] text-primary-500 font-medium">
            Calculated across all classes
          </div>
        </Card>

        {/* Current Timetable Session */}
        <Card className="p-5 relative overflow-hidden border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Timetable Session
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <Chip
              variant={stats.current_session === 'morning' ? 'primary' : stats.current_session === 'afternoon' ? 'secondary' : 'tertiary'}
              size="md"
              className="capitalize font-bold text-xs"
            >
              {stats.current_session ? `${stats.current_session} Session` : 'Off-Schedule Session'}
            </Chip>
          </div>
          <div className="mt-2 text-[11px] text-gray-500 font-medium">
            Face scanner recording enabled
          </div>
        </Card>
      </div>

      {/* Admin Dedicated Quick Actions (Purely Administrative) */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-3">
          Administrative Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Button
            variant="primary"
            size="sm"
            className="w-full justify-center text-xs font-semibold shadow-xs"
            onClick={() => navigate('/live')}
          >
            <Video className="w-4 h-4 mr-1.5" />
            Live Camera Station
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center text-xs font-semibold"
            onClick={() => navigate('/students')}
          >
            <Users className="w-4 h-4 mr-1.5 text-primary-500" />
            Manage Students
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center text-xs font-semibold"
            onClick={() => navigate('/enroll')}
          >
            <UserPlus className="w-4 h-4 mr-1.5 text-indigo-500" />
            Enroll Biometrics
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center text-xs font-semibold"
            onClick={() => navigate('/reports')}
          >
            <BarChart2 className="w-4 h-4 mr-1.5 text-emerald-500" />
            Analytics & Reports
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center text-xs font-semibold"
            onClick={() => navigate('/settings')}
          >
            <Settings className="w-4 h-4 mr-1.5 text-purple-500" />
            Hardware & Config
          </Button>
        </div>
      </Card>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trend Chart */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Attendance Trend (Last 7 Days)
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Daily student attendance percentage overview
              </p>
            </div>
            <span className="text-xs font-mono px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500">
              7-Day Window
            </span>
          </div>
          <div className="h-64 w-full">
            <AttendanceTrend data={trend_data} />
          </div>
        </Card>

        {/* Session Distribution */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Session Breakdown
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Morning vs afternoon distribution
              </p>
            </div>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            <SessionDonut data={session_donut_data} />
          </div>
        </Card>
      </div>

      {/* Recent Activity Log */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
            Recent Attendance Log
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-primary-600 dark:text-primary-400"
            onClick={() => navigate('/records')}
          >
            View All Records →
          </Button>
        </div>

        {recent_activity.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recent_activity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 rounded-xl"
              >
                <Avatar className="h-10 w-10 text-xs" name={activity.student_name} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                    {activity.student_name}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Roll: {activity.roll_no} • {activity.session}
                  </p>
                </div>
                <Chip variant="success" size="sm" className="text-[10px]">
                  Verified
                </Chip>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No records marked yet today"
            description="Attendance records will populate here in real-time as students scan."
          />
        )}
      </Card>
    </div>
  )
}