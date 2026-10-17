import { useState, useEffect, useRef, useCallback } from 'react'

export interface CameraDevice {
  deviceId: string
  label: string
  kind: 'videoinput' | 'audioinput' | 'audiooutput'
}

export interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement>
  devices: CameraDevice[]
  selectedDeviceId: string | null
  isStreaming: boolean
  hasCamera: boolean
  error: string | null
  activeLabel: string
  requestCameraAccess: (deviceId?: string) => Promise<boolean>
  selectDevice: (deviceId: string) => Promise<void>
  toggleStream: () => void
  captureFrame: () => string | null
}

export const useCamera = (): UseCameraReturn => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [devices, setDevices] = useState<CameraDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [activeLabel, setActiveLabel] = useState<string>('')
  const [isStreaming, setIsStreaming] = useState<boolean>(false)
  const [hasCamera, setHasCamera] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)

  // Enumerate cameras and auto-detect
  const getDevices = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      setError('Media devices API not supported by this browser')
      setHasCamera(false)
      return []
    }

    try {
      const deviceInfos = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = deviceInfos
        .filter(device => device.kind === 'videoinput')
        .map((device, idx) => ({
          deviceId: device.deviceId,
          label: device.label || (idx === 0 ? 'Integrated Device Camera' : `Camera ${idx + 1}`),
          kind: device.kind
        }))

      setDevices(videoDevices)
      setHasCamera(videoDevices.length > 0)

      // Auto-detect and pick default device if none selected
      if (videoDevices.length > 0 && !selectedDeviceId) {
        // Prefer built-in/front camera if no external webcam, or first available
        setSelectedDeviceId(videoDevices[0].deviceId)
        setActiveLabel(videoDevices[0].label)
      }
      return videoDevices
    } catch (err: any) {
      console.warn('Error enumerating cameras:', err)
      return []
    }
  }, [selectedDeviceId])

  // Request camera stream with automatic fallback
  const requestCameraAccess = useCallback(async (deviceIdToUse?: string): Promise<boolean> => {
    setError(null)
    const targetId = deviceIdToUse || selectedDeviceId

    // Build constraints: if specific device selected, use it, else fallback to device camera
    const constraints: MediaStreamConstraints = {
      audio: false,
      video: targetId
        ? {
            deviceId: { ideal: targetId },
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 15 }
          }
        : {
            facingMode: 'user', // Auto-detect built-in front camera
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
    }

    try {
      // Stop any existing stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
        mediaStreamRef.current = null
      }

      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints)
      } catch (specErr) {
        // Fallback to basic video constraint if ideal device ID failed
        console.warn('Ideal camera constraint failed, falling back to basic video:', specErr)
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      }

      mediaStreamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        try {
          await videoRef.current.play()
        } catch (e) {
          // Auto-play was prevented or handled
        }
      }

      const activeTrack = stream.getVideoTracks()[0]
      if (activeTrack) {
        const settings = activeTrack.getSettings()
        if (settings.deviceId) {
          setSelectedDeviceId(settings.deviceId)
        }
        setActiveLabel(activeTrack.label || 'Active Camera')
      }

      setIsStreaming(true)
      setHasCamera(true)
      setError(null)

      // Refresh devices to get true hardware labels once permission is granted
      await getDevices()
      return true
    } catch (err: any) {
      console.error('Camera access failed:', err)
      let msg = 'Could not access camera. Please allow camera permissions.'
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No physical camera detected on this device. You can upload photos instead.'
        setHasCamera(false)
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission denied. Please enable camera access in your browser.'
      }
      setError(msg)
      setIsStreaming(false)
      return false
    }
  }, [selectedDeviceId, getDevices])

  // Select a camera device explicitly
  const selectDevice = useCallback(async (deviceId: string) => {
    setSelectedDeviceId(deviceId)
    const matching = devices.find(d => d.deviceId === deviceId)
    if (matching) {
      setActiveLabel(matching.label)
    }
    if (isStreaming) {
      await requestCameraAccess(deviceId)
    }
  }, [devices, isStreaming, requestCameraAccess])

  // Toggle streaming on/off
  const toggleStream = useCallback(() => {
    if (isStreaming) {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
        mediaStreamRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      setIsStreaming(false)
    } else {
      requestCameraAccess()
    }
  }, [isStreaming, requestCameraAccess])

  // Capture frame as base64 JPEG
  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !isStreaming) return null
    const video = videoRef.current
    if (video.videoWidth === 0 || video.videoHeight === 0) return null

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.85)
  }, [isStreaming])

  // Initial detection on mount
  useEffect(() => {
    getDevices()

    // Listen for device changes (e.g. plugging/unplugging webcam)
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      const handleDeviceChange = () => {
        getDevices()
      }
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
      }
    }
  }, [getDevices])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
        mediaStreamRef.current = null
      }
    }
  }, [])

  return {
    videoRef,
    devices,
    selectedDeviceId,
    isStreaming,
    hasCamera,
    error,
    activeLabel,
    requestCameraAccess,
    selectDevice,
    toggleStream,
    captureFrame
  }
}