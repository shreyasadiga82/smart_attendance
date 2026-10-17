import React, { useEffect } from 'react'
import { useRecognition } from '../../hooks/useRecognition'
import { FaceOverlay } from './FaceOverlay'
import { useCamera } from '../../hooks/useCamera'
import { Button } from '../ui/Button'
import { Switch } from '../ui/Switch'
import { StatusBanner } from './StatusBanner'
import { CameraPicker } from './CameraPicker'

interface CameraViewProps {
  className?: string
}

export const CameraView: React.FC<CameraViewProps> = ({ className = '' }) => {
  const {
    videoRef,
    devices,
    selectedDeviceId,
    isStreaming,
    error: cameraError,
    requestCameraAccess,
    selectDevice,
    toggleStream,
    captureFrame
  } = useCamera()
  const { results, isProcessing, error: recognitionError, sendFrame } = useRecognition()

  // Send frames periodically when streaming
  useEffect(() => {
    if (!isStreaming) return

    const interval = setInterval(() => {
      const frame = captureFrame()
      if (frame && sendFrame) {
        sendFrame(frame)
      }
    }, 400) // ~2.5 FPS for recognition

    return () => clearInterval(interval)
  }, [isStreaming, captureFrame, sendFrame])

  return (
    <div className={`relative rounded-2xl overflow-hidden bg-black shadow-lg ${className}`}>
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-[440px] object-cover"
      />

      {/* Face overlay */}
      <FaceOverlay
        videoRef={videoRef}
        results={results}
        isProcessing={isProcessing}
      />

      {/* Status banner */}
      <StatusBanner
        results={results}
        isProcessing={isProcessing}
      />

      {/* Controls Bar */}
      <div className="p-3 bg-gray-900/80 backdrop-blur-md border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Camera picker */}
        <CameraPicker
          devices={devices}
          selectedDeviceId={selectedDeviceId}
          onDeviceChange={selectDevice}
        />

        {/* Stream toggle */}
        <div className="flex items-center space-x-3">
          <Switch
            label="Stream"
            checked={isStreaming}
            onChange={toggleStream}
            checkedChildren="On"
            uncheckedChildren="Off"
          />
          <Button
            variant={isStreaming ? 'outline' : 'primary'}
            size="sm"
            onClick={() => requestCameraAccess()}
            disabled={isStreaming}
          >
            {isStreaming ? 'Camera Active' : 'Start Camera'}
          </Button>
        </div>

        {/* Error message */}
        {(cameraError || recognitionError) && (
          <div className="text-xs text-red-400 font-medium">
            {cameraError || recognitionError}
          </div>
        )}
      </div>
    </div>
  )
}