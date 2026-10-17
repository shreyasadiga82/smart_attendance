import React, { useState, useRef } from 'react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { CameraView } from '../components/camera/CameraView'
import { Switch } from '../components/ui/Switch'
import { Toast } from '../components/ui/Toast'
import { Chip } from '../components/ui/Chip'
import { useAuth } from '../lib/auth'

interface EnrollFormStep1 {
  roll_no: string
  name: string
  class_name: string
  parent_phone: string
  parent_email: string
}

interface EnrollFormStep2 {
  images: string[] // base64 encoded images
}

export const EnrollStudent = () => {
  const [step, setStep] = useState<number>(1)
  const [formStep1, setFormStep1] = useState<EnrollFormStep1>({
    roll_no: '',
    name: '',
    class_name: '',
    parent_phone: '',
    parent_email: ''
  })
  const [formStep2, setFormStep2] = useState<EnrollFormStep2>({
    images: []
  })
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [showToast, setShowToast] = useState<boolean>(false)
  const [toastMessage, setToastMessage] = useState<string>('')
  const [toastVariant, setToastVariant] = useState<'success' | 'error' | 'info'>('info')
  const { login } = useAuth() // We'll use auth to get the token for API calls
  const videoRef = useRef<HTMLVideoElement>(null)
  const capturedImagesRef = useRef<string[]>([])

  // Handle step change
  const nextStep = () => {
    if (step < 3) {
      setStep(step + 1)
    }
  }

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  // Handle form step 1 change
  const handleStep1Change = (field: keyof EnrollFormStep1, value: string) => {
    setFormStep1(prev => ({ ...prev, [field]: value }))
  }

  // Handle capturing an image from the camera
  const captureImage = () => {
    if (!videoRef.current) return
    // Create a canvas to capture the current frame
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8)
    const base64 = imageDataUrl.split(',')[1]
    // Add to captured images
    setFormStep2(prev => ({
      images: [...prev.images, base64]
    }))
    capturedImagesRef.current = [...capturedImagesRef.current, base64]
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Step 1: Create student
      const studentResponse = await fetch('/api/students/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // In a real app, we would include the auth token
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          roll_no: formStep1.roll_no,
          name: formStep1.name,
          class_name: formStep1.class_name,
          parent_phone: formStep1.parent_phone,
          parent_email: formStep1.parent_email
        })
      })

      if (!studentResponse.ok) {
        throw new Error('Failed to create student')
      }

      const studentData = await studentResponse.json()
      const studentId = studentData.id

      // Step 2: Enroll face images
      const enrollmentResponse = await fetch(`/api/enrollment/step2/${studentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          student_id: studentId,
          images: formStep2.images
        })
      })

      if (!enrollmentResponse.ok) {
        throw new Error('Failed to enroll face images')
      }

      const enrollmentData = await enrollmentResponse.json()
      setToastMessage(enrollmentData.message || 'Enrollment successful!')
      setToastVariant('success')
      setShowToast(true)
      // Reset form and go back to step 1
      setStep(1)
      setFormStep1({
        roll_no: '',
        name: '',
        class_name: '',
        parent_phone: '',
        parent_email: ''
      })
      setFormStep2({ images: [] })
      capturedImagesRef.current = []
    } catch (err: any) {
      setError(err.message || 'Enrollment failed')
      setToastMessage(err.message || 'Enrollment failed')
      setToastVariant('error')
      setShowToast(true)
    } finally {
      setLoading(false)
    }
  }

  const handleToastClose = () => {
    setShowToast(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Enroll New Student
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Step {step} of 3
          </p>
        </div>

        {/* Stepper */}
        <div className="flex justify-center space-x-2 text-sm font-medium">
          <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className="w-3 h-3 rounded-full bg-primary-600 ${step >= 1 ? 'bg-primary-600' : 'bg-gray-300'}"></div>
            <div>Details</div>
          </div>
          <div className="w-px h-px bg-gray-300"></div>
          <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className="w-3 h-3 rounded-full bg-primary-600 ${step >= 2 ? 'bg-primary-600' : 'bg-gray-300'}"></div>
            <div>Face Capture</div>
          </div>
          <div className="w-px h-px bg-gray-300"></div>
          <div className={`flex items-center space-x-2 ${step === 3 ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className="w-3 h-3 rounded-full bg-primary-600 ${step === 3 ? 'bg-primary-600' : 'bg-gray-300'}"></div>
            <div>Review</div>
          </div>
        </div>

        <div className="space-y-6">
          {step === 1 && (
            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
              <div>
                <Input
                  label="Roll Number"
                  placeholder="Enter roll number"
                  value={formStep1.roll_no}
                  onChange={(e) => handleStep1Change('roll_no', e.target.value)}
                  required
                />
              </div>
              <div>
                <Input
                  label="Full Name"
                  placeholder="Enter full name"
                  value={formStep1.name}
                  onChange={(e) => handleStep1Change('name', e.target.value)}
                  required
                />
              </div>
              <div>
                <Input
                  label="Class"
                  placeholder="Enter class"
                  value={formStep1.class_name}
                  onChange={(e) => handleStep1Change('class_name', e.target.value)}
                  required
                />
              </div>
              <div>
                <Input
                  label="Parent Phone Number"
                  placeholder="Enter parent phone number"
                  value={formStep1.parent_phone}
                  onChange={(e) => handleStep1Change('parent_phone', e.target.value)}
                />
              </div>
              <div>
                <Input
                  label="Parent Email"
                  type="email"
                  placeholder="Enter parent email"
                  value={formStep1.parent_email}
                  onChange={(e) => handleStep1Change('parent_email', e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={step === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="primary"
                  onClick={nextStep}
                  disabled={step === 1}
                >
                  Next
                </Button>
              </div>
            </form>
          )}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Face Capture</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Please look at the camera and follow the instructions. We will capture 10 images from different angles.
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Captured Images: {formStep2.images.length}/10</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={captureImage}
                    disabled={formStep2.images.length >= 10}
                  >
                    Capture Image
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {/* Preview of captured images */}
                  {formStep2.images.map((image, index) => (
                    <div key={index} className="aspect-w-1 aspect-h-1 bg-gray-200 dark:bg-gray-600 rounded-md overflow-hidden">
                      <img
                        src={`data:image/jpeg;base64,${image}`}
                        alt={`Captured image ${index + 1}`}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ))}
                  {/* Placeholder for remaining slots */}
                  {[...Array(10 - formStep2.images.length)].map((_, index) => (
                    <div key={`placeholder-${index}`} className="aspect-w-1 aspect-h-1 bg-gray-200 dark:bg-gray-600 rounded-md flex items-center justify-center">
                      <div className="text-xs text-gray-500 dark:text-gray-400">Tap to capture</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={prevStep}
                >
                  Previous
                </Button>
                <Button
                  variant="primary"
                  onClick={nextStep}
                  disabled={formStep2.images.length === 0}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Review</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Please review the information below before submitting.
                </p>
              </div>
              <div className="space-y-4">
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Roll Number</span>
                    <span className="text-sm text-gray-900 dark:text-gray-100">{formStep1.roll_no}</span>
                  </div>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</span>
                    <span className="text-sm text-gray-900 dark:text-gray-100">{formStep1.name}</span>
                  </div>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Class</span>
                    <span className="text-sm text-gray-900 dark:text-gray-100">{formStep1.class_name}</span>
                  </div>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Parent Phone</span>
                    <span className="text-sm text-gray-900 dark:text-gray-100">{formStep1.parent_phone}</span>
                  </div>
                </div>
                {formStep1.parent_email && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Parent Email</span>
                      <span className="text-sm text-gray-900 dark:text-gray-100">{formStep1.parent_email}</span>
                    </div>
                  </div>
                )}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Captured Images</span>
                    <span className="text-sm text-gray-900 dark:text-gray-100">{formStep2.images.length} photos</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-between mt-8">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  loading={loading}
                >
                  Submit Enrollment
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}