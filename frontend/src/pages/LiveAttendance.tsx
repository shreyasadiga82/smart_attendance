import React from 'react'
import { CameraView } from '../components/camera/CameraView'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { Avatar } from '../components/ui/Avatar'
import { useAuth } from '../lib/auth'
import { useEffect, useState } from 'react'
import { apiRequest } from '../lib/api'

interface MarkedStudent {
  id: number
  name: string
  roll_no: string
  timestamp: string
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
      <div className="flex-1 flex">
        {/* Camera view - takes most of the width */}
        <div className="flex-1 flex flex-col">
          <CameraView className="flex-1" />
          {/* Today's marked list - sidebar */}
          <div className="w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
            <div className="px-4 py-3">
              <h3 className="text-lg font-medium mb-4">Today's Marked</h3>
              {markedStudents.length > 0 ? (
                <div className="space-y-2">
                  {markedStudents.map((student) => (
                    <div key={student.id} className="flex items-center space-x-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                      <Avatar className="h-8 w-8" name={student.name} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {student.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {student.roll_no}
                        </p>
                      </div>
                      <Chip variant="success" size="xs">
                        Marked
                      </Chip>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No students marked today
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}