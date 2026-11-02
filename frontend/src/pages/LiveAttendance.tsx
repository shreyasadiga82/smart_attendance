import React from 'react'
import { CameraView } from '../components/camera/CameraView'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { Avatar } from '../components/ui/Avatar'
import { useAuth } from '../lib/auth'
import { useEffect, useState } from 'react'
import { apiRequest } from '../lib/api'
import { formatTime } from '../lib/utils'

interface MarkedStudent {
  id: number
  student_id?: number
  timestamp: string
  name?: string
  roll_no?: string
  student?: {
    name: string
    roll_no: string
  }
}

export const LiveAttendance = () => {
  const { user } = useAuth()
  const [markedStudents, setMarkedStudents] = useState<MarkedStudent[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Fetch today's marked students
    const fetchMarked = async () => {
      try {
        setLoading(true)
        const data = await apiRequest<MarkedStudent[]>('/attendance/today')
        setMarkedStudents(data)
      } catch (err: any) {
        setError(err.message || 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }

    fetchMarked()
    // Set up an interval to refresh the list every 5 seconds
    const interval = setInterval(fetchMarked, 5000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-lg">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <p className="text-error-500">{error}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Live Attendance
          </h1>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm">
              <span className="sr-only">Toggle fullscreen</span>
            </Button>
            <Button variant="outline" size="sm">
              <span className="sr-only">Toggle sound</span>
            </Button>
            <Chip
              variant="secondary"
              size="sm"
            >
              {user?.name ?? 'User'}
            </Chip>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row p-4 gap-4">
        {/* Camera view - takes most of the width */}
        <div className="flex-1 flex flex-col">
          <CameraView className="flex-1" />
        </div>

        {/* Today's marked list - sidebar */}
        <div className="w-full lg:w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Today's Attendance</h3>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {markedStudents.length} Marked
            </span>
          </div>

          <div className="p-4 flex-1 overflow-y-auto max-h-[600px]">
            {markedStudents.length > 0 ? (
              <div className="space-y-2.5">
                {markedStudents.map((item) => {
                  const sName = item.student?.name || item.name || `Student #${item.student_id || item.id}`
                  const sRoll = item.student?.roll_no || item.roll_no || ''
                  return (
                    <div key={item.id} className="flex items-center space-x-3 p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
                      <Avatar className="h-9 w-9 shadow-xs" name={sName} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {sName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                          {sRoll} {item.timestamp ? `• ${formatTime(item.timestamp)}` : ''}
                        </p>
                      </div>
                      <Chip variant="success" size="xs">
                        Marked
                      </Chip>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                No students marked today yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}