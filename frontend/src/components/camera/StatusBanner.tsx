import React from 'react'

interface StatusBannerProps {
  results: {
    bbox: number[] // [x1, y1, x2, y2]
    confidence: number
    studentId: number | null
    studentName: string | null
    rollNo: string | null
    status: 'unknown' | 'recognized' | 'marked' | 'already_marked'
  }[]
  isProcessing: boolean
}

export const StatusBanner = ({
  results,
  isProcessing
}: StatusBannerProps) => {
  // Determine the overall status based on results
  // We'll show the status of the first recognized face, or a general message
  let message = ''
  let variant: 'success' | 'error' | 'warning' | 'info' = 'info'

  if (isProcessing) {
    message = 'Processing...'
    variant = 'info'
  } else if (results.length === 0) {
    message = 'No face detected'
    variant = 'warning'
  } else {
    // Find the first recognized face
    const recognizedFace = results.find(r => r.status === 'recognized' || r.status === 'marked' || r.status === 'already_marked')
    if (recognizedFace) {
      if (recognizedFace.status === 'marked') {
        message = `Welcome, ${recognizedFace.studentName}! Attendance marked.`
        variant = 'success'
      } else if (recognizedFace.status === 'already_marked') {
        message = `Hello again, ${recognizedFace.studentName}! Already marked today.`
        variant = 'warning'
      } else if (recognizedFace.status === 'recognized') {
        message = `Welcome, ${recognizedFace.studentName}!`
        variant = 'success'
      }
    } else {
      // Unknown face
      message = 'Face not recognized'
      variant = 'error'
    }
  }

  return (
    <div className={`mt-4 px-4 py-3 rounded-lg text-center font-medium
      ${variant === 'success' ? 'bg-success-500/20 text-success-800 dark:bg-success-500/10 dark:text-success-900'
      : variant === 'error' ? 'bg-error-500/20 text-error-800 dark:bg-error-500/10 dark:text-error-900'
      : variant === 'warning' ? 'bg-warning-500/20 text-warning-800 dark:bg-warning-500/10 dark:text-warning-900'
      : 'bg-primary-500/20 text-primary-800 dark:bg-primary-500/10 dark:text-primary-900'}`}
    >
      {message}
    </div>
  )
}