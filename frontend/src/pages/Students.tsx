import React, { useEffect, useState } from 'react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Chip } from '../components/ui/Chip'
import { Avatar } from '../components/ui/Avatar'
import { EmptyState } from '../components/ui/EmptyState'
import { useAuth } from '../lib/auth'

interface Student {
  id: number
  roll_no: string
  name: string
  class_name: string
  parent_phone: string | null
  parent_email: string | null
  created_at: string
}

export const Students = () => {
  const { user } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [filterClass, setFilterClass] = useState<string>('')

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/students/')
        if (!response.ok) {
          throw new Error('Failed to fetch students')
        }
        const data = await response.json()
        setStudents(data)
      } catch (err: any) {
        setError(err.message || 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }

    fetchStudents()
  }, [])

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4">Loading students...</p>
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

  // Filter students based on search term and class
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          student.roll_no.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesClass = !filterClass || student.class_name === filterClass
    return matchesSearch && matchesClass
  })

  // Get unique classes for filter dropdown
  const classes = [...new Set(students.map(student => student.class_name))].sort()

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Students
        </h2>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
          >
            Add New Student
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex space-x-4">
          <Input
            placeholder="Search by name or roll number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Select
            label="Filter by Class"
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="w-48"
          >
            {/* Options will be the classes array */}
          </Select>
        </div>
      </div>

      <div className="grid gap-6">
        {filteredStudents.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredStudents.map(student => (
              <Card key={student.id} className="flex flex-col h-full">
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12" name={student.name} />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {student.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {student.roll_no}
                        </p>
                      </div>
                    </div>
                    <Chip
                      variant="secondary"
                      size="sm"
                    >
                      {student.class_name}
                    </Chip>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="p-1"
                      onClick={() => {
                        // Edit student
                      }}
                    >
                      <span className="sr-only">Edit student</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="p-1"
                      onClick={() => {
                        // Delete student
                      }}
                    >
                      <span className="sr-only">Delete student</span>
                    </Button>
                  </div>
                </div>
                <div className="mt-auto">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Created: {new Date(student.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
        <EmptyState
          title="No students found"
          description="No students match the current filters."
        />
      )}
      </div>
    </div>
  )
}