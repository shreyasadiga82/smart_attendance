import React, { useState, useEffect } from 'react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Chip } from '../components/ui/Chip'
import { useAuth } from '../lib/auth'

interface AttendanceRecord {
  id: number
  student: {
    name: string
    roll_no: string
    class_name: string
  }
  date: string
  session: string
  timestamp: string
  method: string
  note: string | null
}

export const Records = () => {
  const { user } = useAuth()
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<{
    startDate: string | null
    endDate: string | null
    className: string | null
    session: string | null
    status: string | null
  }>({
    startDate: null,
    endDate: null,
    className: null,
    session: null,
    status: null
  })

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        setLoading(true)
        // Build query parameters from filters
        const params = new URLSearchParams()
        if (filters.startDate) params.append('start_date', filters.startDate)
        if (filters.endDate) params.append('end_date', filters.endDate)
        if (filters.className) params.append('class_name', filters.className)
        if (filters.session) params.append('session', filters.session)
        if (filters.status) params.append('status', filters.status)

        const response = await fetch(`/api/attendance/?${params.toString()}`)
        if (!response.ok) {
          throw new Error('Failed to fetch records')
        }
        const data = await response.json()
        setRecords(data)
      } catch (err: any) {
        setError(err.message || 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }

    fetchRecords()
  }, [filters])

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4">Loading records...</p>
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Attendance Records
        </h2>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
          >
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
          >
            Export Excel
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <div className="grid gap-4 sm:grid-cols-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date
            </label>
            <Input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value || null }))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date
            </label>
            <Input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value || null }))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Class
            </label>
            <Select
              value={filters.className || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, className: e.target.value || null }))}
              className="w-full"
            >
              {/* Options would be fetched from backend */}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Session
            </label>
            <Select
              value={filters.session || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, session: e.target.value || null }))}
              className="w-full"
            >
              <option value="">All Sessions</option>
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <Select
              value={filters.status || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value || null }))}
              className="w-full"
            >
              <option value="">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
            </Select>
          </div>
          <div className="flex-col justify-end">
            <Button
              variant="primary"
              onClick={() => {
                // Apply filters
              }}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Student
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Class
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Session
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Method
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Note
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 dark:divide-gray-700 dark:bg-gray-900">
            {records.length > 0 ? (
              records.map((record) => (
                <tr key={record.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {new Date(record.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 flex items-center space-x-3 text-sm text-gray-900 dark:text-gray-100">
                    <Avatar className="h-8 w-8" name={record.student.name} />
                    <div>
                      <p className="text-sm font-medium">{record.student.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{record.student.roll_no}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {record.student.class_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {record.session}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(record.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <Chip
                      variant={record.method === 'auto' ? 'secondary' : 'primary'}
                      size="xs"
                    >
                      {record.method === 'auto' ? 'Auto' : 'Manual'}
                    </Chip>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {record.note || <span className="text-gray-400 dark:text-gray-500">-</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-sm">
                    <Button
                      variant="outline"
                      size="xs"
                      className="p-1"
                      onClick={() => {
                        // Edit record
                      }}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-6 py-12 text-center text-gray-500 dark:text-gray-400" colSpan="8">
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}