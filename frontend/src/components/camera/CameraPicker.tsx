import React from 'react'

interface CameraDevice {
  deviceId: string
  label: string
  kind: 'videoinput' | 'audioinput' | 'audiooutput'
}

interface CameraPickerProps {
  devices: CameraDevice[]
  selectedDeviceId: string | null
  onDeviceChange: (deviceId: string) => void
}

export const CameraPicker = ({
  devices,
  selectedDeviceId,
  onDeviceChange
}: CameraPickerProps) => {
  if (devices.length === 0) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">No cameras found</div>
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Camera
      </label>
      <select
        value={selectedDeviceId || ''}
        onChange={(e) => onDeviceChange(e.target.value)}
        className={`
          block w-full rounded-md border-0 py-1.5 pl-3 pr-9
          ring-1 ring-inset ring-gray-300 dark:ring-gray-600
          placeholder-gray-400 dark:placeholder-gray-500
          focus:ring-2 focus:ring-inset focus:ring-primary-600
          sm:text-sm sm:leading-6
        `}
      >
        {devices.map(device => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label || `Camera ${devices.indexOf(device) + 1}`}
          </option>
        ))}
      </select>
    </div>
  )
}