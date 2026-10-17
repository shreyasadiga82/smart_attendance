import { useState, useEffect, useRef, useCallback } from 'react'

interface CameraDevice {
  deviceId: string
  label: string
  kind: 'videoinput' | 'audioinput' | 'audiooutput'
}

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement>
  devices: CameraDevice[]
  selectedDeviceId: string | null
  isStreaming: boolean
  error: string | null
  requestCameraAccess: () => Promise<void>
  selectDevice: (deviceId: string) => void
  toggleStream: () => void
}

export const useCamera = (): UseCameraReturn => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [devices, setDevices] = useState<CameraDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)

  // Get available cameras and microphones
  const getDevices = useCallback(async () => {
    try {
      const deviceInfos = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = deviceInfos.filter(
        device => device.kind === 'videoinput'
      )
      setDevices(videoDevices)
      // If no device is selected, select the first one
      if (!selectedDeviceId && videoDevices.length > 0) {
        setSelectedDeviceId(videoDevices[0].deviceId)
      }
    } catch (err) {
      console.error('Error enumerating devices:', err)
      setError('Failed to enumerate devices')
    }
  }, [selectedDeviceId])

  // Request camera access and start streaming
  const requestCameraAccess = useCallback(async () => {
    if (!selectedDeviceId) {
      setError('No camera selected')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: selectedDeviceId },
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 5 } // Limit to 5 fps to reduce bandwidth
        }
      })

      // Stop any existing stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
      }

      mediaStreamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setIsStreaming(true)
      setError(null)
    } catch (err) {
      console.error('Error accessing camera:', err)
      setError('Failed to access camera. Please check permissions.')
      setIsStreaming(false)
    }
  }, [selectedDeviceId])

  // Select a camera device
  const selectDevice = useCallback((deviceId: string) => {
    setSelectedDeviceId(deviceId)
    // If we're already streaming, restart with the new device
    if (isStreaming) {
      requestCameraAccess()
    }
  }, [isStreaming, requestCameraAccess])

  // Toggle streaming on/off
  const toggleStream = useCallback(() => {
    if (isStreaming) {
      // Stop streaming
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
      }
      mediaStreamRef.current = null
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      setIsStreaming(false)
    } else {
      // Start streaming
      requestCameraAccess()
    }
  }, [isStreaming, requestCameraAccess])

  // Get devices on mount
  useEffect(() => {
    getDevices()
  }, [getDevices])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  return {
    videoRef,
    devices,
    selectedDeviceId,
    isStreaming,
    error,
    requestCameraAccess,
    selectDevice,
    toggleStream
  }
}