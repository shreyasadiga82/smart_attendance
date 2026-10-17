import React, { useState, useEffect } from 'react'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { CameraPicker } from '../camera/CameraPicker'
import { useCamera } from '../../hooks/useCamera'
import { apiRequest } from '../../lib/api'
import { Camera, Upload, Trash2, CheckCircle2, AlertCircle, RefreshCw, Sparkles, UserCheck } from 'lucide-react'

interface Student {
  id: number
  roll_no: string
  name: string
  class_name: string
  biometrics_count?: number
  is_enrolled?: boolean
  last_biometric_at?: string | null
}

interface BiometricModalProps {
  open: boolean
  student: Student | null
  onClose: () => void
  onSuccess: () => void
}

export const BiometricModal: React.FC<BiometricModalProps> = ({
  open,
  student,
  onClose,
  onSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera')
  const [capturedImages, setCapturedImages] = useState<string[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

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

  // Start camera when modal opens in camera tab
  useEffect(() => {
    if (open && activeTab === 'camera' && !isStreaming) {
      requestCameraAccess()
    }
  }, [open, activeTab, isStreaming, requestCameraAccess])

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setCapturedImages([])
      setError(null)
      setSuccessMsg(null)
    }
  }, [open, student])

  if (!student) return null

  // Capture single photo from live feed
  const handleSnap = () => {
    const frame = captureFrame()
    if (frame) {
      setCapturedImages(prev => [...prev, frame].slice(-5)) // Keep up to 5 shots
      setError(null)
    } else {
      setError('Could not capture frame. Ensure camera is active.')
    }
  }

  // Handle file uploads
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newImgs: string[] = []
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setCapturedImages(prev => [...prev, event.target!.result as string].slice(-5))
        }
      }
      reader.readAsDataURL(file)
    })
  }

  // Remove single image from queue
  const removeImage = (index: number) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index))
  }

  // Submit biometrics to backend
  const handleSaveBiometrics = async () => {
    if (capturedImages.length === 0) {
      setError('Please capture or upload at least 1 face image.')
      return
    }

    try {
      setLoading(true)
      setError(null)
      await apiRequest(`/students/${student.id}/biometrics`, {
        method: 'POST',
        body: JSON.stringify({ images: capturedImages })
      })

      setSuccessMsg(`Successfully saved ${capturedImages.length} biometric templates for ${student.name}!`)
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1200)
    } catch (err: any) {
      setError(err.message || 'Failed to save biometric templates.')
    } finally {
      setLoading(false)
    }
  }

  // Clear biometrics
  const handleDeleteBiometrics = async () => {
    if (!confirm(`Are you sure you want to clear biometric templates for ${student.name}?`)) return

    try {
      setLoading(true)
      setError(null)
      await apiRequest(`/students/${student.id}/biometrics`, {
        method: 'DELETE'
      })
      setSuccessMsg(`Biometrics cleared for ${student.name}.`)
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1000)
    } catch (err: any) {
      setError(err.message || 'Failed to delete biometrics.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Biometrics Enrollment: ${student.name}`}
      className="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Student summary banner */}
        <div className="flex flex-wrap items-center justify-between p-3 bg-gradient-to-r from-primary-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800/80 rounded-xl border border-primary-100 dark:border-gray-700">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{student.name}</span>
              <span className="text-xs bg-white dark:bg-gray-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300 font-mono">
                {student.roll_no}
              </span>
              <span className="text-xs bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full font-medium">
                {student.class_name}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Status:{' '}
              {student.is_enrolled ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  Enrolled ({student.biometrics_count || 1} templates registered)
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  Not Enrolled — Biometrics Missing
                </span>
              )}
            </p>
          </div>

          {student.is_enrolled && (
            <Button
              variant="outline"
              size="xs"
              onClick={handleDeleteBiometrics}
              disabled={loading}
              className="text-red-600 hover:text-red-700 border-red-200 dark:border-red-900/50"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Reset Biometrics
            </Button>
          )}
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('camera')}
            className={`py-2 px-4 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition-colors ${
              activeTab === 'camera'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Device Camera / Webcam</span>
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-2 px-4 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition-colors ${
              activeTab === 'upload'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload Photo Files</span>
          </button>
        </div>

        {/* Tab 1: Live Camera Capture */}
        {activeTab === 'camera' && (
          <div className="space-y-3">
            {/* Camera Picker Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-gray-50 dark:bg-gray-800/60 rounded-lg">
              <CameraPicker
                devices={devices}
                selectedDeviceId={selectedDeviceId}
                onDeviceChange={selectDevice}
                disabled={loading}
              />
              <Button
                variant="outline"
                size="xs"
                onClick={() => requestCameraAccess()}
                disabled={loading}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Reconnect
              </Button>
            </div>

            {/* Video Viewfinder */}
            <div className="relative w-full h-64 bg-black rounded-xl overflow-hidden flex items-center justify-center shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder guide circle */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-44 h-56 rounded-full border-2 border-dashed border-primary-400/70 shadow-sm flex flex-col items-center justify-end pb-3">
                  <span className="text-[10px] text-white/90 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
                    Position Face Inside
                  </span>
                </div>
              </div>

              {/* Camera status overlay */}
              {!isStreaming && (
                <div className="absolute inset-0 bg-gray-900/90 flex flex-col items-center justify-center text-center p-4">
                  <Camera className="w-10 h-10 text-gray-400 mb-2 animate-pulse" />
                  <p className="text-sm font-medium text-gray-200">
                    {cameraError || 'Starting device camera...'}
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    className="mt-3"
                    onClick={() => requestCameraAccess()}
                  >
                    Allow & Start Camera
                  </Button>
                </div>
              )}
            </div>

            {/* Capture Action Bar */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Tip: Capture 1–3 clear shots (front and slightly angled) for best recognition accuracy.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSnap}
                disabled={!isStreaming || loading}
                className="shadow-md"
              >
                <Sparkles className="w-4 h-4 mr-1.5" />
                Snap Photo ({capturedImages.length}/5)
              </Button>
            </div>
          </div>
        )}

        {/* Tab 2: Upload Photos */}
        {activeTab === 'upload' && (
          <div className="space-y-3">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:border-primary-500 dark:hover:border-primary-500 transition-colors">
              <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Upload student face photos
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Select 1 to 5 clear JPG or PNG images with good lighting
              </p>
              <label className="inline-block cursor-pointer">
                <span className="px-4 py-2 text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white rounded-lg shadow-sm">
                  Browse Images
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        {/* Captured / Uploaded Photo Previews */}
        {capturedImages.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Captured Biometric Samples ({capturedImages.length})
            </label>
            <div className="flex items-center space-x-2 overflow-x-auto pb-2">
              {capturedImages.map((img, idx) => (
                <div key={idx} className="relative group flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 border-primary-500 bg-gray-100">
                  <img src={img} alt={`Sample ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-90 hover:opacity-100 transition-opacity"
                    title="Remove sample"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                  <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] text-center py-0.5">
                    Sample #{idx + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feedback messages */}
        {error && (
          <div className="flex items-center space-x-2 p-3 text-xs bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center space-x-2 p-3 text-xs bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveBiometrics}
            disabled={capturedImages.length === 0 || loading}
          >
            <UserCheck className="w-4 h-4 mr-1.5" />
            {loading ? 'Processing Embeddings...' : `Save Biometrics (${capturedImages.length})`}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
