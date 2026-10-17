import React, { useState, useEffect } from 'react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Chip } from '../components/ui/Chip'
import { apiRequest } from '../lib/api'
import { Download, FileSpreadsheet, Filter, CheckCircle2, XCircle, TrendingUp, Users } from 'lucide-react'

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

export const Reports: React.FC = () => {
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

  const fetchReport = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.startDate) params.append('start_date', filters.startDate)
      if (filters.endDate) params.append('end_date', filters.endDate)
      if (filters.className) params.append('class_name', filters.className)
      if (filters.session) params.append('session', filters.session)
      if (filters.status) params.append('status', filters.status)

      const data = await apiRequest<ReportData>(`/reports/?${params.toString()}`)
      setReportData(data)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReport()
  }, [])

  const handleExportCSV = async () => {
    const params = new URLSearchParams()
    if (filters.startDate) params.append('start_date', filters.startDate)
    if (filters.endDate) params.append('end_date', filters.endDate)
    if (filters.className) params.append('class_name', filters.className)
    if (filters.session) params.append('session', filters.session)

    const token = localStorage.getItem('token')
    try {
      const resp = await fetch(`/api/reports/export/csv?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!resp.ok) throw new Error('Failed to download CSV')
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance_analytics_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
    } catch (e: any) {
      alert(`Export error: ${e.message}`)
    }
  }

  const handleExportExcel = async () => {
    const params = new URLSearchParams()
    if (filters.startDate) params.append('start_date', filters.startDate)
    if (filters.endDate) params.append('end_date', filters.endDate)
    if (filters.className) params.append('class_name', filters.className)
    if (filters.session) params.append('session', filters.session)

    const token = localStorage.getItem('token')
    try {
      const resp = await fetch(`/api/reports/export/excel?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!resp.ok) throw new Error('Failed to download Excel')
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance_analytics_${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
    } catch (e: any) {
      alert(`Export error: ${e.message}`)
    }
  }

  const summary = reportData?.summary
  const rows = reportData?.rows || []

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span>Attendance Reports & Analytics</span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Aggregate attendance summaries, session rates, and official downloadable sheets.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Download CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExportExcel}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />
            Download Excel (.xlsx)
          </Button>
        </div>
      </div>

      {/* Summary Metrics */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 border-l-4 border-l-primary-500 bg-white dark:bg-gray-800">
            <p className="text-xs font-medium text-gray-500 uppercase">Active Students</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{summary.total_students}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-emerald-500 bg-white dark:bg-gray-800">
            <p className="text-xs font-medium text-gray-500 uppercase">Attendance Rate</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {summary.attendance_percentage}%
            </p>
          </Card>
          <Card className="p-4 border-l-4 border-l-indigo-500 bg-white dark:bg-gray-800">
            <p className="text-xs font-medium text-gray-500 uppercase">Present Records</p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{summary.total_present_records}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-amber-500 bg-white dark:bg-gray-800">
            <p className="text-xs font-medium text-gray-500 uppercase">Total Days Evaluated</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{summary.total_days}</p>
          </Card>
        </div>
      )}

      {/* Filters Card */}
      <Card className="p-4 bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
              From Date
            </label>
            <Input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value || null }))}
              className="w-full text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
              To Date
            </label>
            <Input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value || null }))}
              className="w-full text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Class
            </label>
            <Input
              placeholder="e.g. Class 10-A"
              value={filters.className || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, className: e.target.value || null }))}
              className="w-full text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Session
            </label>
            <select
              value={filters.session || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, session: e.target.value || null }))}
              className="w-full text-xs py-2 px-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-200"
            >
              <option value="">All Sessions</option>
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
            </select>
          </div>
          <div className="flex items-end space-x-2">
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              onClick={fetchReport}
            >
              <Filter className="w-3.5 h-3.5 mr-1" />
              Apply
            </Button>
          </div>
        </div>
      </Card>

      {/* Reports Table */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-xs text-gray-500">Generating report...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-600 text-xs">
            {error}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/60">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Roll No</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Student Name</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Class</th>
                  <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Morning</th>
                  <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Afternoon</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Time In</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700/60">
                {rows.length > 0 ? (
                  rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-750/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-mono text-gray-500 dark:text-gray-400">
                        {row.roll_no}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-gray-900 dark:text-gray-100">
                        {row.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 dark:text-gray-300">
                        {row.class_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-xs">
                        {row.morning ? (
                          <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Present
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-red-500 font-medium">
                            <XCircle className="w-4 h-4 mr-1" /> Absent
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-xs">
                        {row.afternoon ? (
                          <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Present
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-red-500 font-medium">
                            <XCircle className="w-4 h-4 mr-1" /> Absent
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-xs font-mono text-gray-500 dark:text-gray-400">
                        {row.time_in ? new Date(row.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-6 py-12 text-center text-xs text-gray-500 dark:text-gray-400" colSpan={6}>
                      No report records found for the selected period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}