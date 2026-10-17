import { Camera, RefreshCw } from 'lucide-react'
import { CameraDevice } from '../../hooks/useCamera'

interface CameraPickerProps {
  devices: CameraDevice[]
  selectedDeviceId: string | null
  onDeviceChange: (deviceId: string) => void
  disabled?: boolean
  className?: string
}

export const CameraPicker = ({
  devices,
  selectedDeviceId,
  onDeviceChange,
  disabled = false,
  className = ''
}: CameraPickerProps) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
        <Camera className="w-4 h-4 mr-1 text-primary-500" />
        <span className="hidden sm:inline font-medium">Camera:</span>
      </div>

      {devices.length === 0 ? (
        <div className="flex items-center text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
          <span>Auto-detecting device camera...</span>
        </div>
      ) : (
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <select
            value={selectedDeviceId || (devices[0]?.deviceId ?? '')}
            onChange={(e) => onDeviceChange(e.target.value)}
            disabled={disabled}
            className="w-full text-xs font-medium bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg py-1.5 pl-2.5 pr-8 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm transition-all"
            title="Select video input device"
          >
            {devices.map((device, idx) => (
              <option key={device.deviceId || idx} value={device.deviceId}>
                {device.label || `Device Camera ${idx + 1}`}
                {idx === 0 && devices.length === 1 ? ' (Auto-detected)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}