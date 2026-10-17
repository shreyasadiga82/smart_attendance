import { useState, useEffect, useRef, useCallback } from 'react'
import { useWebSocket } from '../lib/ws'
import { useCamera } from './useCamera'

interface RecognitionResult {
  bbox: number[] // [x1, y1, x2, y2]
  confidence: number
  studentId: number | null
  studentName: string | null
  rollNo: string | null
  status: 'unknown' | 'recognized' | 'marked' | 'already_marked'
}

interface UseRecognitionReturn {
  videoRef: React.RefObject<HTMLVideoElement>
  results: RecognitionResult[]
  isProcessing: boolean
  error: string | null
  sendFrame: (frame: HTMLVideoElement) => void
}

export const useRecognition = (): UseRecognitionReturn => {
  const { socket, connected, sendMessage } = useWebSocket()
  const { videoRef, devices, selectedDeviceId, isStreaming, error: cameraError, requestCameraAccess, selectDevice, toggleStream } = useCamera()
  const [results, setResults] = useState<RecognitionResult[]>([])
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastFrameTime = useRef<number>(0)

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (!socket) return

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'recognition_results') {
          setResults(data.results)
          setIsProcessing(false)
        } else if (data.type === 'error') {
          setError(data.message)
          setIsProcessing(false)
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err)
      }
    }

    socket.addEventListener('message', handleMessage)
    return () => {
      socket.removeEventListener('message', handleMessage)
    }
  }, [socket])

  // Send frame to backend via WebSocket at a limited FPS (5 fps)
  const sendFrame = useCallback((videoElement: HTMLVideoElement) => {
    if (!connected || !socket) {
      setError('WebSocket not connected')
      return
    }

    // Limit to 5 fps
    const now = performance.now()
    if (now - lastFrameTime.current < 200) { // 200ms = 5 fps
      return
    }
    lastFrameTime.current = now

    // Create a canvas to capture the current frame
    const canvas = document.createElement('canvas')
    canvas.width = videoElement.videoWidth
    canvas.height = videoElement.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)

    // Convert to JPEG and then to base64
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8) // 80% quality
    const base64 = imageDataUrl.split(',')[1]

    // Send to backend
    setIsProcessing(true)
    sendMessage({
      type: 'frame',
      data: base64,
      timestamp: now
    })
  }, [connected, sendMessage])

  // Start processing frames when streaming
  useEffect(() => {
    if (!isStreaming || !videoRef.current) return

    const processFrame = () => {
      if (videoRef.current) {
        sendFrame(videoRef.current)
      }
      animationFrameRef.current = requestAnimationFrame(processFrame)
    }

    // Start the animation loop
    animationFrameRef.current = requestAnimationFrame(processFrame)
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isStreaming, sendFrame, videoRef])

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return {
    videoRef,
    results,
    isProcessing,
    error: cameraError || error,
    sendFrame
  }
}