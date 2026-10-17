import React, { useEffect, useState, useMemo } from 'react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { Avatar } from '../components/ui/Avatar'
import { EmptyState } from '../components/ui/EmptyState'
import { CameraPicker } from '../components/camera/CameraPicker'
import { useCamera } from '../hooks/useCamera'
import { apiRequest } from '../lib/api'
import { useAuth } from '../lib/auth'
import {
  GraduationCap,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Camera,
  ClipboardCheck,
  Download,
  Sparkles,
  RefreshCw,
  Search,
  Check,
  ShieldCheck,
  Fingerprint
} from 'lucide-react'

interface Student {
  id: number
  roll_no: string
  name: string
  class_name: string
  is_enrolled?: boolean
  biometrics_count?: number
}

interface AttendanceRecord {
  id: number
  student_id: number
  date: string
  session: string
  method: string
  timestamp: string
  student?: Student
}

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('Class 10-A')
  const [selectedSession, setSelectedSession] = useState<'morning' | 'afternoon'>('morning')
  const [activeMode, setActiveMode] = useState<'sheet' | 'camera'>('sheet')
  const [loading, setLoading] = useState(true)
  const [savingAttendance, setSavingAttendance] = useState(false)
  const [statusMap, setStatusMap] = useState<Record<number, 'present' | 'absent' | 'late'>>({})
  const [feedback, setFeedback] = useState<string | null>(null)

  // Camera hook for live mode
  const {
    videoRef,
    devices,
    selectedDeviceId,
    isStreaming,
    hasCamera,
    error: cameraError,
    requestCameraAccess,
    selectDevice,
    captureFrame
  } = useCamera()

  // Load data
  const loadData = async () => {
    try {
      setLoading(true)
      const [allStudents, attRecords] = await Promise.all([
        apiRequest<Student[]>('/students/'),
        apiRequest<AttendanceRecord[]>('/attendance/today').catch(() => [])
      ])
      setStudents(allStudents)
      setTodayRecords(attRecords)

      // Initialize status map from today's records
      const initialMap: Record<number, 'present' | 'absent' | 'late'> = {}
      allStudents.forEach(s => {
        const found = attRecords.find(r => r.student_id === s.id && r.session === selectedSession)
        if (found) {
          initialMap[s.id] = found.note?.includes('Late') ? 'late' : 'present'
        } else {
          initialMap[s.id] = 'absent'
        }
      })
      setStatusMap(initialMap)
    } catch (err: any) {
      console.error('Failed to load teacher data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedSession])

  // Extract distinct classes
  const classes = useMemo(() => {
    const list = Array.from(new Set(students.map(s => s.class_name))).sort()
    return list.length > 0 ? list : ['Class 10-A', 'Class 10-B', 'Class 11-A']
  }, [students])

  // Filter students for the selected class
  const classStudents = useMemo(() => {
    return students.filter(s => s.class_name === selectedClass)
  }, [students, selectedClass])

  // Stats for this class
  const classPresentCount = useMemo(() => {
    return classStudents.filter(s => statusMap[s.id] === 'present' || statusMap[s.id] === 'late').length
  }, [classStudents, statusMap])

  const classAbsentCount = classStudents.length - classPresentCount
  const classPercentage = classStudents.length > 0
    ? Math.round((classPresentCount / classStudents.length) * 100)
    : 0

  // Start camera when entering camera mode
  useEffect(() => {
    if (activeMode === 'camera' && !isStreaming) {
      requestCameraAccess()
    }
  }, [activeMode, isStreaming, requestCameraAccess])

  // Toggle student status
  const toggleStudentStatus = (studentId: number, status: 'present' | 'absent' | 'late') => {
    setStatusMap(prev => ({ ...prev, [studentId]: status }))
  }

  // Mark all present
  const handleMarkAllPresent = () => {
    const updated = { ...statusMap }
    classStudents.forEach(s => {
      updated[s.id] = 'present'
    })
    setStatusMap(updated)
  }

  // Save manual attendance sheet
  const handleSaveAttendance = async () => {
    try {
      setSavingAttendance(true)
      const todayStr = new Date().toISOString().split('T')[0]

      let markedCount = 0
      for (const student of classStudents) {
        const currentStatus = statusMap[student.id]
        if (currentStatus === 'present' || currentStatus === 'late') {
          try {
            await apiRequest('/attendance/', {
              method: 'POST',
              body: JSON.stringify({
                student_id: student.id,
                date: todayStr,
                session: selectedSession,
                method: 'manual',
                note: currentStatus === 'late' ? 'Marked Late by Teacher' : 'Marked by Teacher'
              })
            })
            markedCount++
          } catch (e) {
            // Already marked or duplicate
          }
        }
      }

      setFeedback(`Successfully recorded attendance for ${markedCount} students in ${selectedClass}!`)
      setTimeout(() => setFeedback(null), 3000)
      loadData()
    } catch (err: any) {
      alert(`Error saving attendance: ${err.message}`)
    } finally {
      setSavingAttendance(false)
    }
  }

  // Export class report to CSV
  const handleExportClassReport = () => {
    const todayStr = new Date().toISOString().split('T')[0]
    let csv = `Roll No,Student Name,Class,Date,Session,Attendance Status\n`
    classStudents.forEach(s => {
      const st = statusMap[s.id] || 'absent'
      csv += `"${s.roll_no}","${s.name}","${s.class_name}","${todayStr}","${selectedSession}","${st.toUpperCase()}"\n`
    })

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance_${selectedClass.replace(/\s+/g, '_')}_${todayStr}.csv`
    a.click()
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Teacher Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 bg-gradient-to-r from-primary-600 to-indigo-700 text-white rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
              <GraduationCap className="w-5 h-5 text-white" />
            </span>
            <span className="text-xs uppercase tracking-wider font-semibold text-primary-100">
              Teacher Classroom Portal
            </span>
          </div>
          <h1 className="text-2xl font-bold mt-1">Class Attendance Workspace</h1>
          <p className="text-xs text-primary-100 mt-0.5">
            Logged in as {user?.username || 'Teacher'}. Auto-detect devices, run live facial recognition or take roll call.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Class Selector Dropdown */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-1.5 border border-white/20">
            <label className="block text-[10px] uppercase font-bold text-primary-200 px-1 mb-0.5">
              Select Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-white text-gray-900 text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none shadow-sm cursor-pointer"
            >
              {classes.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Session Selector */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-1.5 border border-white/20">
            <label className="block text-[10px] uppercase font-bold text-primary-200 px-1 mb-0.5">
              Session
            </label>
            <div className="flex rounded-lg overflow-hidden border border-white/30 text-xs font-medium">
              <button
                onClick={() => setSelectedSession('morning')}
                className={`px-3 py-1.5 transition-colors ${
                  selectedSession === 'morning' ? 'bg-white text-primary-700 font-bold' : 'text-white hover:bg-white/10'
                }`}
              >
                Morning
              </button>
              <button
                onClick={() => setSelectedSession('afternoon')}
                className={`px-3 py-1.5 transition-colors ${
                  selectedSession === 'afternoon' ? 'bg-white text-primary-700 font-bold' : 'text-white hover:bg-white/10'
                }`}
              >
                Afternoon
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Class Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-primary-500 bg-white dark:bg-gray-800">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Class Roster</p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{classStudents.length}</span>
            <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">Enrolled</span>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500 bg-white dark:bg-gray-800">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Present Today</p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{classPresentCount}</span>
            <span className="text-xs text-emerald-600 font-medium">{classPercentage}% Present</span>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-red-500 bg-white dark:bg-gray-800">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Absent Today</p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-red-600 dark:text-red-400">{classAbsentCount}</span>
            <span className="text-xs text-red-500 font-medium">Unexcused</span>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-indigo-500 bg-white dark:bg-gray-800">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Biometrics Ready</p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {classStudents.filter(s => s.is_enrolled).length}
            </span>
            <span className="text-xs text-indigo-600 font-medium">Face Profiles</span>
          </div>
        </Card>
      </div>

      {/* Main Mode Tabs */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveMode('sheet')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center space-x-2 transition-all ${
              activeMode === 'sheet'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>1-Click Roll Call Sheet</span>
          </button>
          <button
            onClick={() => setActiveMode('camera')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center space-x-2 transition-all ${
              activeMode === 'camera'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Classroom Live Camera</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="xs"
            onClick={handleExportClassReport}
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Export Class CSV
          </Button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs font-semibold flex items-center space-x-2 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Mode 1: Roll Call Sheet */}
      {activeMode === 'sheet' && (
        <Card className="p-5 bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-700">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                {selectedClass} Student Roll Call ({selectedSession.toUpperCase()})
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Tap Present, Late, or Absent for each student, then click Save Attendance.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="xs"
                onClick={handleMarkAllPresent}
              >
                <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                Mark All Present
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveAttendance}
                disabled={savingAttendance}
              >
                {savingAttendance ? 'Saving...' : 'Save Class Attendance'}
              </Button>
            </div>
          </div>

          {classStudents.length === 0 ? (
            <EmptyState
              title={`No students enrolled in ${selectedClass}`}
              description="Add students to this class in the Admin directory to begin taking attendance."
            />
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {classStudents.map(student => {
                const currentStatus = statusMap[student.id] || 'absent'
                return (
                  <div
                    key={student.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-gray-700/20 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10 shadow-xs" name={student.name} />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {student.name}
                          </span>
                          <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                            ({student.roll_no})
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 mt-0.5">
                          {student.is_enrolled ? (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center font-medium">
                              <ShieldCheck className="w-3 h-3 mr-0.5" />
                              Face Biometric Registered
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                              Biometrics Missing
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Pill Switcher */}
                    <div className="flex items-center space-x-1.5 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => toggleStudentStatus(student.id, 'present')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                          currentStatus === 'present'
                            ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/50'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-emerald-50 hover:text-emerald-700'
                        }`}
                      >
                        Present
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleStudentStatus(student.id, 'late')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                          currentStatus === 'late'
                            ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-400/50'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-amber-50 hover:text-amber-700'
                        }`}
                      >
                        Late
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleStudentStatus(student.id, 'absent')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                          currentStatus === 'absent'
                            ? 'bg-red-600 text-white shadow-sm ring-2 ring-red-400/50'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-red-50 hover:text-red-700'
                        }`}
                      >
                        Absent
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {/* Mode 2: Classroom Live Camera */}
      {activeMode === 'camera' && (
        <Card className="p-5 bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-700">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary-600" />
                <span>Classroom Automated Face Recognition</span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Camera auto-detects device hardware. Students walk past to mark attendance automatically.
              </p>
            </div>

            {/* Camera Picker Bar */}
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 p-1.5 rounded-xl border border-gray-200 dark:border-gray-600">
              <CameraPicker
                devices={devices}
                selectedDeviceId={selectedDeviceId}
                onDeviceChange={selectDevice}
              />
              <Button
                variant="outline"
                size="xs"
                onClick={() => requestCameraAccess()}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Reconnect
              </Button>
            </div>
          </div>

          {/* Video Viewfinder */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 relative w-full h-80 bg-black rounded-xl overflow-hidden flex items-center justify-center shadow-md">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder Target */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-56 h-64 border-2 border-dashed border-emerald-400/80 rounded-2xl flex flex-col items-center justify-end pb-3">
                  <span className="text-[10px] bg-black/70 text-emerald-300 px-2.5 py-0.5 rounded-full font-mono">
                    Target Recognition Zone
                  </span>
                </div>
              </div>

              {!isStreaming && (
                <div className="absolute inset-0 bg-gray-900/95 flex flex-col items-center justify-center text-center p-4">
                  <Camera className="w-12 h-12 text-gray-400 mb-2 animate-bounce" />
                  <p className="text-sm font-semibold text-gray-200">
                    {cameraError || 'Device camera ready for activation'}
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    className="mt-3"
                    onClick={() => requestCameraAccess()}
                  >
                    Start Classroom Camera
                  </Button>
                </div>
              )}
            </div>

            {/* Recent Live recognitions */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex flex-col">
              <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Recent Recognitions</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                  Live
                </span>
              </h3>

              <div className="flex-1 overflow-y-auto space-y-2 max-h-64 divide-y divide-gray-100 dark:divide-gray-800">
                {classStudents.filter(s => statusMap[s.id] === 'present').length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">
                    No recognitions yet this session. Students walking in will appear here.
                  </p>
                ) : (
                  classStudents
                    .filter(s => statusMap[s.id] === 'present')
                    .map(student => (
                      <div key={student.id} className="pt-2 flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <Avatar className="w-7 h-7" name={student.name} />
                          <div>
                            <p className="font-semibold text-gray-800 dark:text-gray-200">{student.name}</p>
                            <p className="text-[10px] text-gray-500 font-mono">{student.roll_no}</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">
                          Marked Present
                        </span>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
