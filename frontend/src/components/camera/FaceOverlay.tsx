import React from 'react'

interface FaceOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement>
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

export const FaceOverlay = ({
  videoRef,
  results,
  isProcessing
}: FaceOverlayProps) => {
  // Calculate the scaling factor to map from video coordinates to container coordinates
  // We'll use a ref to measure the video element
  const containerRef = React.useRef<HTMLDivElement>(null)

  // We'll use a resize observer or just calculate on render
  // For simplicity, we'll assume the video container is the same size as the video
  // In a real implementation, we would need to handle the aspect ratio

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
    >
      {results.map((result, index) => {
        const [x1, y1, x2, y2] = result.bbox
        // Calculate width and height
        const width = x2 - x1
        const height = y2 - y1

        // Determine color based on status
        let bgColor = 'bg-gray-200 dark:bg-gray-600'
        let textColor = 'text-gray-800 dark:text-gray-200'
        let borderColor = 'border-gray-300 dark:border-gray-600'

        if (result.status === 'recognized') {
          bgColor = 'bg-primary-500/20'
          textColor = 'text-primary-800'
          borderColor = 'border-primary-500'
        } else if (result.status === 'marked') {
          bgColor = 'bg-success-500/20'
          textColor = 'text-success-800'
          borderColor = 'border-success-500'
        } else if (result.status === 'already_marked') {
          bgColor = 'bg-warning-500/20'
          textColor = 'text-warning-800'
          borderColor = 'border-warning-500'
        } else if (result.status === 'unknown') {
          bgColor = 'bg-error-500/20'
          textColor = 'text-error-800'
          borderColor = 'border-error-500'
        }

        return (
          <div
            key={index}
            className={`
              absolute
              left-[${x1}px]
              top-[${y1}px]
              w-[${width}px]
              h-[${height}px]
              ${borderColor}
              ${bgColor}
              flex flex-col items-start text-sm
              pointer-events-none
              transition-all duration-200
              ${isProcessing ? 'animate-pulse' : ''}
            `}
          >
            <div className="px-2 py-1">
              {result.studentName && (
                <div className="font-medium">{result.studentName}</div>
              )}
              {result.rollNo && (
                <div className="text-xs">{result.rollNo}</div>
              )}
              {result.confidence > 0 && (
                <div className="text-xs">
                  Confidence: {(result.confidence * 100).toFixed(0)}%
                </div>
              )}
            </div>
          </div>
        )}
      )}
    </div>
  )
}