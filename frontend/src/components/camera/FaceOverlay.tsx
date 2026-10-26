import React from 'react'

export interface EyeSensorData {
  eyes_detected: boolean
  left_eye: number[]
  right_eye: number[]
  left_eye_ear?: number
  right_eye_ear?: number
  eye_openness: number
  eye_state: 'open' | 'blink' | 'closed' | 'not_detected' | string
  sharpness?: number
  liveness_score?: number
  liveness_verified: boolean
  status_message?: string
}

export interface RecognitionResult {
  bbox: number[] // [x1, y1, x2, y2]
  track_id?: number
  confidence: number
  studentId?: number | null
  student_id?: number | null
  studentName?: string | null
  student_name?: string | null
  rollNo?: string | null
  roll_no?: string | null
  status: 'unknown' | 'recognized' | 'marked' | 'already_marked' | 'eyes_closed' | 'verifying_eyes' | 'eyes_not_detected' | string
  eye_sensor?: EyeSensorData
}

interface FaceOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement>
  results: RecognitionResult[]
  isProcessing: boolean
}

export const FaceOverlay: React.FC<FaceOverlayProps> = ({
  videoRef,
  results,
  isProcessing
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [scale, setScale] = React.useState<{ x: number; y: number }>({ x: 1, y: 1 })

  // Recalculate scaling based on video intrinsic dimensions vs rendered container
  React.useEffect(() => {
    const updateScale = () => {
      const video = videoRef.current
      const container = containerRef.current
      if (video && container && video.videoWidth > 0 && video.videoHeight > 0) {
        setScale({
          x: container.clientWidth / video.videoWidth,
          y: container.clientHeight / video.videoHeight
        })
      }
    }

    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [videoRef, results])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden z-10"
    >
      {results.map((result, index) => {
        const studentName = result.studentName || result.student_name
        const rollNo = result.rollNo || result.roll_no
        const eyeSensor = result.eye_sensor

        // Compute scaled bounding box
        const x1 = Math.round(result.bbox[0] * scale.x)
        const y1 = Math.round(result.bbox[1] * scale.y)
        const x2 = Math.round(result.bbox[2] * scale.x)
        const y2 = Math.round(result.bbox[3] * scale.y)
        const width = Math.max(30, x2 - x1)
        const height = Math.max(30, y2 - y1)

        // Eye coordinates
        const lx = eyeSensor?.left_eye?.[0] ? Math.round(eyeSensor.left_eye[0] * scale.x) : null
        const ly = eyeSensor?.left_eye?.[1] ? Math.round(eyeSensor.left_eye[1] * scale.y) : null
        const rx = eyeSensor?.right_eye?.[0] ? Math.round(eyeSensor.right_eye[0] * scale.x) : null
        const ry = eyeSensor?.right_eye?.[1] ? Math.round(eyeSensor.right_eye[1] * scale.y) : null

        // Determine theme & borders based on status
        let borderColor = 'border-rose-500'
        let glowColor = 'shadow-[0_0_15px_rgba(244,63,94,0.35)]'
        let badgeBg = 'bg-rose-950/85 text-rose-300 border-rose-500/50'
        let statusTitle = 'Unknown Face'

        if (result.status === 'marked') {
          borderColor = 'border-emerald-400'
          glowColor = 'shadow-[0_0_20px_rgba(52,211,153,0.55)]'
          badgeBg = 'bg-emerald-950/90 text-emerald-200 border-emerald-400/60'
          statusTitle = 'Attendance Marked!'
        } else if (result.status === 'already_marked') {
          borderColor = 'border-amber-400'
          glowColor = 'shadow-[0_0_15px_rgba(251,191,36,0.45)]'
          badgeBg = 'bg-amber-950/90 text-amber-200 border-amber-400/60'
          statusTitle = 'Already Marked Today'
        } else if (result.status === 'recognized') {
          borderColor = 'border-cyan-400'
          glowColor = 'shadow-[0_0_15px_rgba(34,211,238,0.45)]'
          badgeBg = 'bg-cyan-950/90 text-cyan-200 border-cyan-400/60'
          statusTitle = 'Face Verified'
        } else if (result.status === 'eyes_closed') {
          borderColor = 'border-yellow-500'
          glowColor = 'shadow-[0_0_15px_rgba(234,179,8,0.4)]'
          badgeBg = 'bg-yellow-950/90 text-yellow-200 border-yellow-500/60'
          statusTitle = 'Eyes Closed'
        } else if (result.status === 'verifying_eyes') {
          borderColor = 'border-sky-400'
          glowColor = 'shadow-[0_0_15px_rgba(56,189,248,0.4)]'
          badgeBg = 'bg-sky-950/90 text-sky-200 border-sky-400/60'
          statusTitle = 'Verifying Gaze & Eyes...'
        }

        return (
          <React.Fragment key={index}>
            {/* Main Face Reticle Box */}
            <div
              style={{
                left: `${x1}px`,
                top: `${y1}px`,
                width: `${width}px`,
                height: `${height}px`
              }}
              className={`absolute border-2 rounded-xl pointer-events-none transition-all duration-150 ${borderColor} ${glowColor}`}
            >
              {/* Corner brackets */}
              <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-white rounded-tl-sm" />
              <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-white rounded-tr-sm" />
              <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-white rounded-bl-sm" />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-white rounded-br-sm" />

              {/* Status Header Badge */}
              <div className="absolute -top-9 left-0 right-0 flex justify-between items-center px-2 py-0.5 rounded-t-lg bg-black/80 backdrop-blur-md border border-b-0 border-white/20 text-[11px] font-semibold text-white">
                <span className="truncate">{studentName || statusTitle}</span>
                {result.confidence > 0 && (
                  <span className="text-[10px] text-cyan-300 ml-1 font-mono">
                    {(result.confidence * 100).toFixed(0)}%
                  </span>
                )}
              </div>

              {/* Eye Sensor Indicator Bottom Tag */}
              {eyeSensor?.eyes_detected && (
                <div className="absolute -bottom-7 left-0 right-0 flex items-center justify-between px-2 py-0.5 rounded-b-lg bg-black/80 backdrop-blur-md border border-t-0 border-white/20 text-[10px]">
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Eye Sensor: {eyeSensor.eye_state.toUpperCase()}
                  </span>
                  <span className="text-gray-300 font-mono text-[9px]">
                    EAR: {eyeSensor.eye_openness.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Left Eye Reticle Point */}
            {lx !== null && ly !== null && (
              <div
                style={{ left: `${lx - 6}px`, top: `${ly - 6}px` }}
                className="absolute w-3 h-3 rounded-full border border-cyan-400 bg-cyan-400/30 flex items-center justify-center animate-pulse"
              >
                <div className="w-1 h-1 rounded-full bg-cyan-200" />
              </div>
            )}

            {/* Right Eye Reticle Point */}
            {rx !== null && ry !== null && (
              <div
                style={{ left: `${rx - 6}px`, top: `${ry - 6}px` }}
                className="absolute w-3 h-3 rounded-full border border-cyan-400 bg-cyan-400/30 flex items-center justify-center animate-pulse"
              >
                <div className="w-1 h-1 rounded-full bg-cyan-200" />
              </div>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}