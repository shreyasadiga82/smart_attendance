import React, { useState, useEffect } from 'react'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { apiRequest } from '../../lib/api'
import { AlertCircle, UserPlus, Save } from 'lucide-react'

interface Student {
  id?: number
  roll_no: string
  name: string
  class_name: string
  parent_phone?: string | null
  parent_email?: string | null
}

interface StudentModalProps {
  open: boolean
  student: Student | null
  onClose: () => void
  onSuccess: (student: Student) => void
}

export const StudentModal: React.FC<StudentModalProps> = ({
  open,
  student,
  onClose,
  onSuccess
}) => {
  const isEdit = Boolean(student?.id)
  const [formData, setFormData] = useState<Student>({
    roll_no: '',
    name: '',
    class_name: '',
    parent_phone: '',
    parent_email: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (student) {
      setFormData({
        id: student.id,
        roll_no: student.roll_no || '',
        name: student.name || '',
        class_name: student.class_name || '',
        parent_phone: student.parent_phone || '',
        parent_email: student.parent_email || ''
      })
    } else {
      setFormData({
        roll_no: '',
        name: '',
        class_name: 'Class 10-A',
        parent_phone: '',
        parent_email: ''
      })
    }
    setError(null)
  }, [student, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.roll_no || !formData.name || !formData.class_name) {
      setError('Please fill in Roll Number, Full Name, and Class Name.')
      return
    }

    try {
      setLoading(true)
      setError(null)
      let result: Student
      if (isEdit && student?.id) {
        result = await apiRequest<Student>(`/students/${student.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        })
      } else {
        result = await apiRequest<Student>('/students/', {
          method: 'POST',
          body: JSON.stringify(formData)
        })
      }
      onSuccess(result)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save student.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit Student: ${student?.name}` : 'Add New Student'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Roll Number / Student ID *
          </label>
          <Input
            value={formData.roll_no}
            onChange={(e) => setFormData(p => ({ ...p, roll_no: e.target.value.toUpperCase() }))}
            placeholder="e.g. 10A01"
            disabled={isEdit || loading}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Full Name *
          </label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Rahul Sharma"
            disabled={loading}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Class / Division *
          </label>
          <Input
            value={formData.class_name}
            onChange={(e) => setFormData(p => ({ ...p, class_name: e.target.value }))}
            placeholder="e.g. Class 10-A"
            disabled={loading}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Parent Phone Number (for SMS notifications)
          </label>
          <Input
            value={formData.parent_phone || ''}
            onChange={(e) => setFormData(p => ({ ...p, parent_phone: e.target.value }))}
            placeholder="e.g. +91 9876543210"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Parent Email (for attendance alerts)
          </label>
          <Input
            type="email"
            value={formData.parent_email || ''}
            onChange={(e) => setFormData(p => ({ ...p, parent_email: e.target.value }))}
            placeholder="e.g. parent@example.com"
            disabled={loading}
          />
        </div>

        {error && (
          <div className="flex items-center space-x-2 p-2.5 text-xs bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={loading}
          >
            {isEdit ? <Save className="w-4 h-4 mr-1.5" /> : <UserPlus className="w-4 h-4 mr-1.5" />}
            {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Student'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
