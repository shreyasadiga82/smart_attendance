import { useState, useEffect, useRef, useCallback } from 'react'
import { useWebSocket } from '../lib/ws'
import { RecognitionResult } from '../components/camera/FaceOverlay'

export type { RecognitionResult }

interface UseRecognitionOptions {
  active?: boolean
}

interface UseRecognitionReturn {
  results: RecognitionResult[]
  isProcessing: boolean
  error: string | null
  sendFrame: (frame: HTMLVideoElement | string) => void
  connected: boolean
}

export const useRecognition = (options: UseRecognitionOptions = {}): UseRecognitionReturn => {
  const { active = false } = options
  const { socket, connected, connect, disconnect, sendMessage } = useWebSocket()
  const [results, setResults] = useState<RecognitionResult[]>([])
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const lastFrameTime = useRef<number>(0)

  // Connect when active, disconnect when inactive
  useEffect(() => {
    if (active) {
      connect()
    } else {
      disconnect()
      setResults([])
    }
    return () => {
      if (active) {
        disconnect()
      }
    }
  }, [active, connect, disconnect])

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (!socket) return

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'recognition_results') {
          const rawList = data.results || []
          const normalized: RecognitionResult[] = rawList.map((r: any) => ({
            ...r,
            studentId: r.student_id ?? r.studentId ?? null,
            studentName: r.student_name ?? r.studentName ?? null,
            rollNo: r.roll_no ?? r.rollNo ?? null,
            status: r.status || 'unknown',
            eye_sensor: r.eye_sensor
          }))
          setResults(normalized)
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

  // Send frame to backend via WebSocket (accepts either HTMLVideoElement or base64 string)
  const sendFrame = useCallback((frameInput: HTMLVideoElement | string) => {
    if (!connected || !socket) {
      return
    }

    // Limit to ~2.5 fps (400ms)
    const now = performance.now()
    if (now - lastFrameTime.current < 350) {
      return
    }
    lastFrameTime.current = now

    let base64 = ''

    if (typeof frameInput === 'string') {
      base64 = frameInput.includes(',') ? frameInput.split(',')[1] : frameInput
    } else if (frameInput && frameInput.videoWidth && frameInput.videoHeight) {
      const canvas = document.createElement('canvas')
      canvas.width = frameInput.videoWidth
      canvas.height = frameInput.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(frameInput, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
      base64 = dataUrl.split(',')[1]
    }

    if (!base64) return

    setIsProcessing(true)
    sendMessage({
      type: 'frame',
      data: base64,
      timestamp: now
    })
  }, [connected, socket, sendMessage])

  return {
    results,
    isProcessing,
    error,
    sendFrame,
    connected
  }
}