import React, { useEffect, useState } from 'react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { AttendanceTrend } from '../components/charts/AttendanceTrend'
import { SessionDonut } from '../components/charts/SessionDonut'
import { EmptyState } from '../components/ui/EmptyState'
import { Avatar } from '../components/ui/Avatar'

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

export const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Fetch dashboard data from backend
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/dashboard/')
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data')
        }
        const data = await response.json()
        setDashboardData(data)
      } catch (err: any) {
        setError(err.message || 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid gap-6">
          {/* Stats cards */}
          <Card className="col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Today's Attendance</h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  <span className="mr-2">-</span> / <span className="mr-2">-</span>
                </p>
              </div>
              <Chip className="px-3 py-1 text-xs">Loading...</Chip>
            </div>
          </Card>
          {/* Quick actions */}
          <Card>
            <h3 className="text-lg font-medium mb-4">Quick Actions</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Button variant="outline" size="sm" className="w-full">
                Take Attendance
              </Button>
              <Button variant="outline" size="sm" className="w-full">
                Enroll Student
              </Button>
              <Button variant="outline" size="sm" className="w-full">
                View Students
              </Button>
              <Button variant="outline" size="sm" className="w-full">
                Generate Report
              </Button>
            </div>
          </Card>
          {/* Charts */}
          <Card className="col-span-2">
            <h3 className="text-lg font-medium mb-4">Attendance Trend (7 Days)</h3>
            <div className="h-64 w-full">
              <AttendanceTrend data={[]} />
            </div>
          </Card>
          <Card>
            <h3 className="text-lg font-medium mb-4">Session Distribution</h3>
            <div className="h-48 w-full">
              <SessionDonut data={[]} />
            </div>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-error-50 text-error-500 rounded-lg p-4">
          <h3 className="font-bold">Error:</h3>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  const { stats, trend_data, session_donut_data, recent_activity } = dashboardData!

  return (
    <div className="p-6">
      <div className="grid gap-6">
        {/* Stats cards */}
        <Card className="col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Today's Attendance</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.present_count} / {stats.present_count + stats.absent_count}
              </p>
            </div>
            <Chip
              variant={stats.current_session === 'morning' ? 'primary' : stats.current_session === 'afternoon' ? 'secondary' : 'tertiary'}
              size="sm"
            >
              {stats.current_session || 'No active session'}
            </Chip>
          </div>
          <div className="mt-4 flex space-x-4">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-500">Morning Present</h4>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {stats.morning_present}
              </p>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-500">Afternoon Present</h4>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {stats.afternoon_present}
              </p>
            </div>
          </div>
        </Card>
        {/* Quick actions */}
        <Card>
          <h3 className="text-lg font-medium mb-4">Quick Actions</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="primary" size="sm" className="w-full">
              Take Attendance
            </Button>
            <Button variant="outline" size="sm" className="w-full">
              Enroll Student
            </Button>
            <Button variant="outline" size="sm" className="w-full">
              View Students
            </Button>
            <Button variant="outline" size="sm" className="w-full">
              Generate Report
            </Button>
          </div>
        </Card>
        {/* Charts */}
        <Card className="col-span-2">
          <h3 className="text-lg font-medium mb-4">Attendance Trend (7 Days)</h3>
          <div className="h-64 w-full">
            <AttendanceTrend data={trend_data} />
          </div>
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Showing attendance percentage for the last 7 days
          </div>
        </Card>
        <Card>
          <h3 className="text-lg font-medium mb-4">Session Distribution</h3>
          <div className="h-48 w-full">
            <SessionDonut data={session_donut_data} />
          </div>
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Today's attendance by session
          </div>
        </Card>
        {/* Recent activity */}
        <Card className="col-span-2">
          <h3 className="text-lg font-medium mb-4">Recent Activity</h3>
          {recent_activity.length > 0 ? (
            <div className="space-y-4">
              {recent_activity.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Avatar className="h-10 w-10" name={activity.student_name} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {activity.student_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {activity.roll_no} • {activity.session}
                    </p>
                  </div>
                  <Chip
                    variant="success"
                    size="sm"
                  >
                    Present
                  </Chip>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No recent activity"
              description="No attendance records found for today."
            />
          )}
        </Card>
      </div>
    </div>
  )
}