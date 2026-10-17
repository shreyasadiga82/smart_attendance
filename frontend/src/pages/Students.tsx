import React, { useEffect, useState, useMemo } from 'react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Chip } from '../components/ui/Chip'
import { Avatar } from '../components/ui/Avatar'
import { EmptyState } from '../components/ui/EmptyState'
import { apiRequest } from '../lib/api'
import { BiometricModal } from '../components/biometrics/BiometricModal'
import { StudentModal } from '../components/students/StudentModal'
import {
  UserPlus,
  Fingerprint,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Edit2,
  Trash2,
  Sparkles,
  Phone,
  Mail,
  ShieldCheck
} from 'lucide-react'

interface Student {
  id: number
  roll_no: string
  name: string
  class_name: string
  parent_phone: string | null
  parent_email: string | null
  created_at: string
  biometrics_count?: number
  is_enrolled?: boolean
  last_biometric_at?: string | null
}

export const Students: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [filterClass, setFilterClass] = useState<string>('ALL')
  const [filterBiometric, setFilterBiometric] = useState<'ALL' | 'ENROLLED' | 'MISSING'>('ALL')

  // Modals state
  const [selectedStudentForBiometrics, setSelectedStudentForBiometrics] = useState<Student | null>(null)
  const [isBiometricModalOpen, setIsBiometricModalOpen] = useState(false)
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<Student | null>(null)
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false)

  const fetchStudents = async () => {
    try {
      setLoading(true)
      const data = await apiRequest<Student[]>('/students/')
      setStudents(data)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch students')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [])

  // Metrics
  const totalCount = students.length
  const enrolledCount = useMemo(() => students.filter(s => s.is_enrolled).length, [students])
  const missingCount = totalCount - enrolledCount
  const coveragePercent = totalCount > 0 ? Math.round((enrolledCount / totalCount) * 100) : 0

  // Classes list
  const classes = useMemo(() => {
    return Array.from(new Set(students.map(s => s.class_name))).sort()
  }, [students])

  // Filtered students
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const q = searchTerm.toLowerCase()
      const matchesSearch =
        student.name.toLowerCase().includes(q) ||
        student.roll_no.toLowerCase().includes(q) ||
        (student.parent_phone && student.parent_phone.includes(q))
      const matchesClass = filterClass === 'ALL' || student.class_name === filterClass
      const matchesBiometric =
        filterBiometric === 'ALL' ||
        (filterBiometric === 'ENROLLED' && student.is_enrolled) ||
        (filterBiometric === 'MISSING' && !student.is_enrolled)
      return matchesSearch && matchesClass && matchesBiometric
    })
  }, [students, searchTerm, filterClass, filterBiometric])

  const handleDeleteStudent = async (student: Student) => {
    if (!confirm(`Are you sure you want to delete ${student.name} (${student.roll_no})? All attendance and biometrics will be deleted.`)) {
      return
    }

    try {
      await apiRequest(`/students/${student.id}`, { method: 'DELETE' })
      setStudents(prev => prev.filter(s => s.id !== student.id))
    } catch (err: any) {
      alert(`Error deleting student: ${err.message}`)
    }
  }

  const openBiometrics = (student: Student) => {
    setSelectedStudentForBiometrics(student)
    setIsBiometricModalOpen(true)
  }

  const openEdit = (student: Student) => {
    setSelectedStudentForEdit(student)
    setIsStudentModalOpen(true)
  }

  const openCreate = () => {
    setSelectedStudentForEdit(null)
    setIsStudentModalOpen(true)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span>Student & Biometrics Directory</span>
            <span className="text-xs bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 font-mono font-semibold px-2.5 py-0.5 rounded-full">
              {totalCount} Total
            </span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage student registrations, live facial biometrics capture, and parent contact details.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={openCreate}
            className="shadow-sm"
          >
            <UserPlus className="w-4 h-4 mr-1.5" />
            Add New Student
          </Button>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-white to-blue-50/50 dark:from-gray-800 dark:to-gray-800 border-l-4 border-l-primary-500">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Enrolled</p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</span>
            <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">{classes.length} classes</span>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-white to-emerald-50/50 dark:from-gray-800 dark:to-gray-800 border-l-4 border-l-emerald-500">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Face Biometrics Active</p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{enrolledCount}</span>
            <span className="text-xs text-emerald-600 font-medium flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              {coveragePercent}% Ready
            </span>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-white to-amber-50/50 dark:from-gray-800 dark:to-gray-800 border-l-4 border-l-amber-500">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Biometrics Pending</p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{missingCount}</span>
            <span className="text-xs text-amber-600 font-medium">Needs Face Scan</span>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-white to-indigo-50/50 dark:from-gray-800 dark:to-gray-800 border-l-4 border-l-indigo-500">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Biometrics Coverage</p>
          <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${coveragePercent}%` }}
            />
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5 text-right font-medium">
            {coveragePercent}% recognized by camera
          </p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by student name, roll number, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by Class */}
            <div className="flex items-center space-x-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Class:</span>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="text-xs py-1.5 px-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-200 font-medium"
              >
                <option value="ALL">All Classes ({totalCount})</option>
                {classes.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Filter by Biometric Status */}
            <div className="flex items-center space-x-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Biometrics:</span>
              <select
                value={filterBiometric}
                onChange={(e) => setFilterBiometric(e.target.value as any)}
                className="text-xs py-1.5 px-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-200 font-medium"
              >
                <option value="ALL">All Status</option>
                <option value="ENROLLED">Enrolled Only ({enrolledCount})</option>
                <option value="MISSING">Missing Biometrics ({missingCount})</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Students List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-3 text-sm text-gray-500">Loading student biometrics directory...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl p-4 border border-red-200 dark:border-red-800">
          <p className="text-sm font-semibold">Error loading directory: {error}</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          title="No students found"
          description="Try adjusting your search criteria or add a new student."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredStudents.map(student => (
            <Card
              key={student.id}
              className="flex flex-col h-full bg-white dark:bg-gray-800 hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700/80 rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-11 w-11 shadow-sm" name={student.name} />
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
                      {student.name}
                    </h3>
                    <p className="text-xs font-mono text-gray-500 dark:text-gray-400">
                      {student.roll_no}
                    </p>
                  </div>
                </div>

                <span className="text-[11px] font-semibold bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full border border-primary-200/50 dark:border-primary-800">
                  {student.class_name}
                </span>
              </div>

              {/* Biometrics Status Card */}
              <div className={`p-2.5 rounded-lg mb-3 border text-xs ${
                student.is_enrolled
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300'
                  : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 font-medium">
                    {student.is_enrolled ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        <span>Face Enrolled</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                        <span>Biometrics Missing</span>
                      </>
                    )}
                  </div>

                  <span className="text-[10px] bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded shadow-2xs font-mono">
                    {student.biometrics_count || 0} samples
                  </span>
                </div>
              </div>

              {/* Contact info */}
              <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400 mb-4 flex-1">
                {student.parent_phone && (
                  <div className="flex items-center space-x-1.5">
                    <Phone className="w-3 h-3 text-gray-400" />
                    <span>{student.parent_phone}</span>
                  </div>
                )}
                {student.parent_email && (
                  <div className="flex items-center space-x-1.5 truncate">
                    <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{student.parent_email}</span>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between gap-1.5">
                <Button
                  variant={student.is_enrolled ? 'outline' : 'primary'}
                  size="xs"
                  onClick={() => openBiometrics(student)}
                  className="flex-1 justify-center text-xs font-semibold"
                >
                  <Fingerprint className="w-3.5 h-3.5 mr-1" />
                  {student.is_enrolled ? 'Biometrics' : 'Add Face'}
                </Button>

                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => openEdit(student)}
                  className="px-2"
                  title="Edit Student"
                >
                  <Edit2 className="w-3 h-3 text-gray-600 dark:text-gray-300" />
                </Button>

                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => handleDeleteStudent(student)}
                  className="px-2 hover:text-red-600 hover:border-red-300"
                  title="Delete Student"
                >
                  <Trash2 className="w-3 h-3 text-red-500" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Biometrics Modal */}
      <BiometricModal
        open={isBiometricModalOpen}
        student={selectedStudentForBiometrics}
        onClose={() => setIsBiometricModalOpen(false)}
        onSuccess={fetchStudents}
      />

      {/* Add / Edit Student Modal */}
      <StudentModal
        open={isStudentModalOpen}
        student={selectedStudentForEdit}
        onClose={() => setIsStudentModalOpen(false)}
        onSuccess={fetchStudents}
      />
    </div>
  )
}