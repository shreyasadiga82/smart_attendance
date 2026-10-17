import React, { useState, useEffect } from 'react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Chip } from '../components/ui/Chip'
import { useAuth } from '../lib/auth'
import { apiRequest, getAuthToken } from '../lib/api'

interface ReportData {
  rows: {
    roll_no: string
    name: string
    class_name: string
    morning: boolean
    afternoon: boolean
    time_in: string | null
  }[]
  summary: {
    total_students: number
    total_days: number
    total_present_records: number
    total_possible_records: number
    attendance_percentage: number
  }
}

export const Reports = () => {
  const { user } = useAuth()
  const [reportData, setReportData] = useState<ReportData | null>(null)
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
    const fetchReport = async () => {
      try {
        setLoading(true)
        // Build query parameters from filters
        const params = new URLSearchParams()
        if (filters.startDate) params.append('start_date', filters.startDate)
        if (filters.endDate) params.append('end_date', filters.endDate)
        if (filters.className) params.append('class_name', filters.className)
        if (filters.session) params.append('session', filters.session)
        if (filters.status) params.append('status', filters.status)

        const data = await apiRequest<ReportData>(`/reports/?${params.toString()}`)
        setReportData(data)
      } catch (err: any) {
        setError(err.message || 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }

    // Fetch report on mount and when filters change
    fetchReport()
  }, [filters])

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4">Loading report...</p>
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

  const { rows, summary } = reportData!

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Attendance Reports
        </h2>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
          >
            Generate Report
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
            </Select>
          </div>
          <div className="flex-col justify-end">
            <Button
              variant="primary"
              onClick={() => {
                // Apply filters and regenerate report
              }}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                Roll No
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                Class
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                Morning
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                Afternoon
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                Time In
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 dark:divide-gray-700">
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr key={row.roll_no} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {row.roll_no}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {row.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {row.class_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-400">
                    {row.morning ? (
                      <Chip variant="success" size="xs">Yes</Chip>
                    ) : (
                      <Chip variant="error" size="xs">No</Chip>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-400">
                    {row.afternoon ? (
                      <Chip variant="success" size="xs">Yes</Chip>
                    ) : (
                      <Chip variant="error" size="xs">No</Chip>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {row.time_in || <span className="text-gray-400 dark:text-gray-500">-</span>}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-6 py-12 text-center text-gray-500 dark:text-gray-400" colSpan={6}>
                  No data found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <Card>
          <h3 className="text-lg font-medium mb-4">Summary</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Students</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {summary.total_students}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Days</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {summary.total_days}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Present Records</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {summary.total_present_records}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Possible Records</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {summary.total_possible_records}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Attendance Percentage</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {summary.attendance_percentage}%
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}