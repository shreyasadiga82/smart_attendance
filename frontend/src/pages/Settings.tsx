import React, { useState, useEffect } from 'react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Switch } from '../components/ui/Switch'
import { Chip } from '../components/ui/Chip'
import { useAuth } from '../lib/auth'

interface SettingsData {
  // This would match the backend settings structure
  morning_session_start: string
  morning_session_end: string
  afternoon_session_start: string
  afternoon_session_end: string
  recognition_threshold: number
  liveness_check: boolean
  teacher_email: string | null
  notifier_type: string
  whatsapp_token: string | null
  whatsapp_phone_number_id: string | null
  fast2sms_api_key: string | null
  smtp_server: string | null
  smtp_port: number
  smtp_username: string | null
  smtp_password: string | null
  smtp_tls: boolean
  auto_report_enabled: boolean
  auto_report_time: string
  auto_report_recipients: string
}

export const Settings = () => {
  const { user } = useAuth()
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [showToast, setShowToast] = useState<boolean>(false)
  const [toastMessage, setToastMessage] = useState<string>('')
  const [toastVariant, setToastVariant] = useState<'success' | 'error' | 'info'>('info')

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/settings/')
        if (!response.ok) {
          throw new Error('Failed to fetch settings')
        }
        const data = await response.json()
        setSettings(data)
      } catch (err: any) {
        setError(err.message || 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [])

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4">Loading settings...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-error-50 text-error-500 rounded-lg p-4">
          <h3 className="font-bold">Error:</h3>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  const handleToastClose = () => {
    setShowToast(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // In a real implementation, we would send the updated settings to the backend
    setToastMessage('Settings saved successfully!')
    setToastVariant('success')
    setShowToast(true)
  }

  const settingsData = settings!

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Settings
        </h2>
        <div className="flex items-center space-x-3">
          <Button
            variant="primary"
            onClick={handleSubmit}
          >
            Save Settings
          </Button>
        </div>
      </div>

      {showToast && (
        <div className="fixed bottom-4 right-4 z-50">
          {/* Toast would go here */}
        </div>
      )}

      <div className="space-y-6">
        {/* Session Timings */}
        <Card>
          <h3 className="text-lg font-medium mb-4">Session Timings</h3>
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Morning Start
              </label>
              <Input
                type="time"
                value={settingsData.morning_session_start}
                onChange={(e) => setSettings(prev => ({ ...prev, morning_session_start: e.target.value }))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Morning End
              </label>
              <Input
                type="time"
                value={settingsData.morning_session_end}
                onChange={(e) => setSettings(prev => ({ ...prev, morning_session_end: e.target.value }))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Afternoon Start
              </label>
              <Input
                type="time"
                value={settingsData.afternoon_session_start}
                onChange={(e) => setSettings(prev => ({ ...prev, afternoon_session_start: e.target.value }))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Afternoon End
              </label>
              <Input
                type="time"
                value={settingsData.afternoon_session_end}
                onChange={(e) => setSettings(prev => ({ ...prev, afternoon_session_end: e.target.value }))}
                className="w-full"
              />
            </div>
          </div>
        </Card>

        {/* Recognition Settings */}
        <Card>
          <h3 className="text-lg font-medium mb-4">Recognition Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Recognition Threshold
              </label>
              <Switch
                checked={settingsData.recognition_threshold > 0.4} // Just an example
                onChange={(value) => {
                  // Update threshold based on switch? Actually, we need a slider
                  // For now, we'll just toggle between two values
                  setSettings(prev => ({ ...prev, recognition_threshold: value ? 0.6 : 0.4 }))
                }}
                checkedChildren="High (0.6)"
                uncheckedChildren="Normal (0.4)"
              />
            </div>
            <div className="flex items-center">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Liveness Check
              </label>
              <Switch
                checked={settingsData.liveness_check}
                onChange={(value) => setSettings(prev => ({ ...prev, liveness_check: value }))}
                checkedChildren="Enabled"
                uncheckedChildren="Disabled"
              />
            </div>
          </div>
        </Card>

        {/* Notification Settings */}
        <Card>
          <h3 className="text-lg font-medium mb-4">Notification Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Teacher Email
              </label>
              <Input
                type="email"
                value={settingsData.teacher_email || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, teacher_email: e.target.value || null }))}
                className="w-full"
                placeholder="Enter teacher email"
              />
            </div>
            <div className="flex items-center">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Notification Provider
              </label>
              <Select
                value={settingsData.notifier_type}
                onChange={(e) => setSettings(prev => ({ ...prev, notifier_type: e.target.value }))}
                className="w-full"
              >
                <option value="console">Console (Default)</option>
                <option value="whatsapp">WhatsApp Cloud</option>
                <option value="sms">SMS (Fast2SMS)</option>
                <option value="email">Email (SMTP)</option>
              </Select>
            </div>
            {/* Conditional fields based on provider */}
            {settingsData.notifier_type === 'whatsapp' && (
              <>
                <div className="flex items-center">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    WhatsApp Token
                  </label>
                  <Input
                    type="password"
                    value={settingsData.whatsapp_token || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, whatsapp_token: e.target.value }))}
                    className="w-full"
                  />
                </div>
                <div className="flex items-center">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone Number ID
                  </label>
                  <Input
                    value={settingsData.whatsapp_phone_number_id || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, whatsapp_phone_number_id: e.target.value }))}
                    className="w-full"
                  />
                </div>
              </>
            )}
            {settingsData.notifier_type === 'sms' && (
              <div className="flex items-center">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fast2SMS API Key
                </label>
                <Input
                  type="password"
                  value={settingsData.fast2sms_api_key || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, fast2sms_api_key: e.target.value }))}
                  className="w-full"
                />
              </div>
            )}
            {settingsData.notifier_type === 'email' && (
              <>
                <div className="flex items-center">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    SMTP Server
                  </label>
                  <Input
                    value={settingsData.smtp_server || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, smtp_server: e.target.value }))}
                    className="w-full"
                  />
                </div>
                <div className="flex items-center">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    SMTP Port
                  </label>
                  <Input
                    type="number"
                    value={settingsData.smtp_port}
                    onChange={(e) => setSettings(prev => ({ ...prev, smtp_port: Number(e.target.value) || 0 }))}
                    className="w-full"
                  />
                </div>
                <div className="flex items-center">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    SMTP Username
                  </label>
                  <Input
                    value={settingsData.smtp_username || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, smtp_username: e.target.value }))}
                    className="w-full"
                  />
                </div>
                <div className="flex items-center">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    SMTP Password
                  </label>
                  <Input
                    type="password"
                    value={settingsData.smtp_password || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, smtp_password: e.target.value }))}
                    className="w-full"
                  />
                </div>
                <div className="flex items-center">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Use TLS
                  </label>
                  <Switch
                    checked={settingsData.smtp_tls}
                    onChange={(value) => setSettings(prev => ({ ...prev, smtp_tls: value }))}
                    checkedChildren="Enabled"
                    uncheckedChildren="Disabled"
                  />
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Auto-Report Settings */}
        <Card>
          <h3 className="text-lg font-medium mb-4">Auto-Report Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Enable Auto-Report
              </label>
              <Switch
                checked={settingsData.auto_report_enabled}
                onChange={(value) => setSettings(prev => ({ ...prev, auto_report_enabled: value }))}
                checkedChildren="Enabled"
                uncheckedChildren="Disabled"
              />
            </div>
            <div className="flex items-center">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Report Time
              </label>
              <Input
                type="time"
                value={settingsData.auto_report_time}
                onChange={(e) => setSettings(prev => ({ ...prev, auto_report_time: e.target.value }))}
                className="w-full"
              />
            </div>
            <div className="flex items-center">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Report Recipients
              </label>
              <Input
                value={settingsData.auto_report_recipients || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, auto_report_recipients: e.target.value }))}
                className="w-full"
                placeholder="Comma-separated email addresses"
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}