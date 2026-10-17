import React, { useState, useEffect } from 'react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Chip } from '../components/ui/Chip'
import { Avatar } from '../components/ui/Avatar'
import { Dialog } from '../components/ui/Dialog'
import { useAuth } from '../lib/auth'
import { apiRequest } from '../lib/api'
import { Download, FileSpreadsheet, Trash2, Edit2, CheckCircle2, Clock } from 'lucide-react'

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

export const Records: React.FC = () => {
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

  // Edit record state
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null)
  const [editNote, setEditNote] = useState<string>('')
  const [editMethod, setEditMethod] = useState<string>('manual')
  const [savingEdit, setSavingEdit] = useState<boolean>(false)

  const fetchRecords = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.startDate) params.append('start_date', filters.startDate)
      if (filters.endDate) params.append('end_date', filters.endDate)
      if (filters.className) params.append('class_name', filters.className)
      if (filters.session) params.append('session', filters.session)
      if (filters.status) params.append('status', filters.status)

      const data = await apiRequest<AttendanceRecord[]>(`/attendance/?${params.toString()}`)
      setRecords(data)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [filters])

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
      if (!resp.ok) throw new Error('Failed to generate CSV export')
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance_records_${new Date().toISOString().split('T')[0]}.csv`
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
      if (!resp.ok) throw new Error('Failed to generate Excel export')
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance_report_${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
    } catch (e: any) {
      alert(`Export error: ${e.message}`)
    }
  }

  const handleDeleteRecord = async (record: AttendanceRecord) => {
    if (!confirm(`Are you sure you want to delete attendance record for ${record.student.name} on ${record.date}?`)) {
      return
    }

    try {
      await apiRequest(`/attendance/${record.id}`, { method: 'DELETE' })
      setRecords(prev => prev.filter(r => r.id !== record.id))
    } catch (e: any) {
      alert(`Delete error: ${e.message}`)
    }
  }

  const handleOpenEdit = (record: AttendanceRecord) => {
    setEditingRecord(record)
    setEditNote(record.note || '')
    setEditMethod(record.method || 'manual')
  }

  const handleSaveEdit = async () => {
    if (!editingRecord) return
    try {
      setSavingEdit(true)
      await apiRequest(`/attendance/${editingRecord.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          method: editMethod,
          note: editNote
        })
      })
      setEditingRecord(null)
      fetchRecords()
    } catch (e: any) {
      alert(`Update error: ${e.message}`)
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span>Attendance Log Records</span>
            <span className="text-xs bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 font-mono font-semibold px-2.5 py-0.5 rounded-full">
              {records.length} Records
            </span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Complete audit trail of facial recognitions, manual roll calls, and session logs.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Export CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExportExcel}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Start Date
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
              End Date
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
              <option value="morning">Morning Session</option>
              <option value="afternoon">Afternoon Session</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setFilters({ startDate: null, endDate: null, className: null, session: null, status: null })}
            >
              Reset Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Records Table */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-xs text-gray-500">Loading records...</p>
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
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Class</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Session</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Method</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Note</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700/60">
                {records.length > 0 ? (
                  records.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-750/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900 dark:text-gray-100 font-mono">
                        {record.date}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-7 w-7 text-[10px]" name={record.student.name} />
                          <div>
                            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{record.student.name}</p>
                            <p className="text-[10px] text-gray-500 font-mono">{record.student.roll_no}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 dark:text-gray-300">
                        {record.student.class_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs capitalize text-gray-700 dark:text-gray-300">
                        {record.session}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Chip
                          variant={record.method === 'auto' ? 'primary' : 'secondary'}
                          size="xs"
                        >
                          {record.method === 'auto' ? 'Face Auto' : 'Manual'}
                        </Chip>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate">
                        {record.note || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-xs">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleOpenEdit(record)}
                            className="p-1 text-gray-500 hover:text-primary-600 rounded"
                            title="Edit Record"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(record)}
                            className="p-1 text-gray-500 hover:text-red-600 rounded"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-6 py-12 text-center text-xs text-gray-500 dark:text-gray-400" colSpan={8}>
                      No attendance records found matching filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Record Dialog */}
      <Dialog
        open={Boolean(editingRecord)}
        onClose={() => setEditingRecord(null)}
        title="Edit Attendance Record"
      >
        {editingRecord && (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500">Student</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {editingRecord.student.name} ({editingRecord.student.roll_no})
              </p>
              <p className="text-xs text-gray-400">{editingRecord.date} • {editingRecord.session}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Marking Method
              </label>
              <select
                value={editMethod}
                onChange={(e) => setEditMethod(e.target.value)}
                className="w-full text-xs py-2 px-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                <option value="auto">Face Recognition (Auto)</option>
                <option value="manual">Teacher Roll Call (Manual)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Note / Remark
              </label>
              <Input
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="e.g. Arrived 10 minutes late with permission"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingRecord(null)}
                disabled={savingEdit}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveEdit}
                disabled={savingEdit}
              >
                {savingEdit ? 'Saving...' : 'Save Record'}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}