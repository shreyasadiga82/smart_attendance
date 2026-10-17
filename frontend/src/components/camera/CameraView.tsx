import React from 'react'
import { useRecognition } from '../../hooks/useRecognition'
import { FaceOverlay } from './FaceOverlay'
import { useCamera } from '../../hooks/useCamera'
import { Button } from '../ui/Button'
import { Switch } from '../ui/Switch'
import { StatusBanner } from './StatusBanner'
import { CameraPicker } from './CameraPicker'

export const CameraView = () => {
  const { videoRef, devices, selectedDeviceId, isStreaming, error: cameraError, requestCameraAccess, selectDevice, toggleStream } = useCamera()
  const { results, isProcessing, error: recognitionError, sendFrame } = useRecognition()

  // Handle device change
  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    selectDevice(e.target.value)
  }

  // Handle stream toggle
  const handleToggleStream = () => {
    toggleStream()
  }

  return (
    <div className="relative">
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-[400px] bg-gray-200 dark:bg-gray-700"
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
      {/* Controls */}
      <div className="absolute bottom-4 left-4 right-4 flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0 sm:space-x-4">
        {/* Camera picker */}
        <CameraPicker
          devices={devices}
          selectedDeviceId={selectedDeviceId}
          onDeviceChange={handleDeviceChange}
        />
        {/* Stream toggle */}
        <div className="flex items-center space-x-3">
          <Switch
            label="Stream"
            checked={isStreaming}
            onChange={handleToggleStream}
            checkedChildren="On"
            uncheckedChildren="Off"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={requestCameraAccess}
            disabled={isStreaming}
          >
            Start Camera
          </Button>
        </div>
        {/* Error message */}
        {(cameraError || recognitionError) && (
          <div className="text-sm text-error-500 dark:text-error-400">
            {cameraError || recognitionError}
          </div>
        )}
      </div>
    </div>
  )
}