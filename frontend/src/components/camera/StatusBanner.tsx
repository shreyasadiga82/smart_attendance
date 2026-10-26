import React from 'react'
import { RecognitionResult } from './FaceOverlay'

interface StatusBannerProps {
  results: RecognitionResult[]
  isProcessing: boolean
}

export const StatusBanner: React.FC<StatusBannerProps> = ({
  results,
  isProcessing
}) => {
  let message = ''
  let variant: 'success' | 'error' | 'warning' | 'info' = 'info'
  let subtext: string | null = null

  if (isProcessing) {
    message = 'Processing camera feed...'
    variant = 'info'
  } else if (results.length === 0) {
    message = 'Ready - Look at the camera to mark attendance'
    variant = 'info'
  } else {
    // Check for marked face first
    const markedFace = results.find(r => r.status === 'marked')
    const alreadyMarked = results.find(r => r.status === 'already_marked')
    const eyesClosed = results.find(r => r.status === 'eyes_closed')
    const verifying = results.find(r => r.status === 'verifying_eyes')
    const recognized = results.find(r => r.status === 'recognized')

    if (markedFace) {
      const name = markedFace.studentName || markedFace.student_name || 'Student'
      message = `✓ Welcome, ${name}! Attendance successfully marked.`
      subtext = 'Eye sensor confirmed live presence & gaze'
      variant = 'success'
    } else if (alreadyMarked) {
      const name = alreadyMarked.studentName || alreadyMarked.student_name || 'Student'
      message = `✓ Welcome back, ${name}! Attendance already marked for this session.`
      subtext = 'Record verified in system'
      variant = 'warning'
    } else if (eyesClosed) {
      message = '⚠️ Eyes appear closed or blink detected'
      subtext = 'Please keep your eyes open and look directly into the camera'
      variant = 'warning'
    } else if (verifying) {
      message = '👁️ Eye Sensor Active - Verifying live presence...'
      subtext = 'Please hold still facing the camera'
      variant = 'info'
    } else if (recognized) {
      const name = recognized.studentName || recognized.student_name || 'Student'
      message = `Welcome, ${name}!`
      variant = 'success'
    } else {
      message = 'Face detected - Not registered in enrolled students'
      subtext = 'Please enroll first via the Admin / Enrollment tab'
      variant = 'error'
    }
  }

  const colorStyles = {
    success: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    error: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    warning: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    info: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
  }

  return (
    <div className={`mt-3 px-4 py-2.5 rounded-xl border backdrop-blur-md text-center transition-all duration-200 ${colorStyles[variant]}`}>
      <div className="font-medium text-sm">{message}</div>
      {subtext && <div className="text-xs opacity-80 mt-0.5">{subtext}</div>}
    </div>
  )
}