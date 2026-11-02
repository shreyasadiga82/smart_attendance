import React, { useState, useEffect } from 'react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Switch } from '../components/ui/Switch'
import { Dialog } from '../components/ui/Dialog'
import { apiRequest } from '../lib/api'
import { useTheme } from '../hooks/useTheme'
import {
  Save,
  Trash2,
  Cloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  Sliders,
  Send,
  Database,
  Cpu,
  Monitor,
  Sun,
  Moon,
  Mail
} from 'lucide-react'

interface SettingsData {
  morning_session_start: string
  morning_session_end: string
  afternoon_session_start: string
  afternoon_session_end: string
  recognition_threshold: number
  liveness_check: boolean
  stream_fps: number
  frame_width: number
  lcd_mode: string
  teacher_email: string
  notifier_type: string
  auto_report_enabled: boolean
  auto_report_time: string
  auto_report_recipients: string
  supabase_enabled: boolean
  supabase_url: string
  supabase_key: string
  supabase_sync_auto: boolean
  smtp_server: string
  smtp_port: number
  smtp_username: string
  smtp_password: string
  smtp_tls: boolean
}

export const Settings: React.FC = () => {
  const { isDarkMode, setTheme } = useTheme()
  const [settings, setSettings] = useState<SettingsData>({
    morning_session_start: '08:00',
    morning_session_end: '09:30',
    afternoon_session_start: '13:00',
    afternoon_session_end: '14:00',
    recognition_threshold: 0.45,
    liveness_check: true,
    stream_fps: 5,
    frame_width: 640,
    lcd_mode: 'parallel',
    teacher_email: '',
    notifier_type: 'smtp',
    auto_report_enabled: true,
    auto_report_time: '18:00',
    auto_report_recipients: '',
    supabase_enabled: false,
    supabase_url: '',
    supabase_key: '',
    supabase_sync_auto: true,
    smtp_server: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    smtp_tls: true
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // SMTP Testing state
  const [testingSmtp, setTestingSmtp] = useState(false)
  const [smtpStatus, setSmtpStatus] = useState<{ success: boolean; message: string } | null>(null)
  const [testRecipient, setTestRecipient] = useState('')

  // Supabase testing state
  const [testingSupabase, setTestingSupabase] = useState(false)
  const [syncingSupabase, setSyncingSupabase] = useState(false)
  const [supabaseStatus, setSupabaseStatus] = useState<string | null>(null)

  // Reset dialog state
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [cleaningData, setCleaningData] = useState(false)

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const data = await apiRequest<SettingsData>('/settings/all')
      setSettings(prev => ({ ...prev, ...data }))
      setError(null)
    } catch (err: any) {
      console.error('Failed to load settings:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      setMessage(null)
      await apiRequest('/settings/all', {
        method: 'POST',
        body: JSON.stringify(settings)
      })
      setMessage({ type: 'success', text: 'All settings and hardware configurations applied successfully!' })
      setTimeout(() => setMessage(null), 4000)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save settings.' })
    } finally {
      setSaving(false)
    }
  }

  const handleTestSupabase = async () => {
    try {
      setTestingSupabase(true)
      setSupabaseStatus(null)
      const res = await apiRequest<any>('/settings/supabase/test', {
        method: 'POST',
        body: JSON.stringify({
          supabase_url: settings.supabase_url,
          supabase_key: settings.supabase_key
        })
      })
      setSupabaseStatus(res.message || 'Supabase test executed.')
    } catch (err: any) {
      setSupabaseStatus(`Connection failed: ${err.message}`)
    } finally {
      setTestingSupabase(false)
    }
  }

  const handleSyncSupabase = async () => {
    try {
      setSyncingSupabase(true)
      setSupabaseStatus(null)
      const res = await apiRequest<any>('/settings/supabase/sync', {
        method: 'POST'
      })
      setSupabaseStatus(res.message || 'Sync complete.')
    } catch (err: any) {
      setSupabaseStatus(`Sync failed: ${err.message}`)
    } finally {
      setSyncingSupabase(false)
    }
  }

  const handleTestSmtp = async () => {
    try {
      setTestingSmtp(true)
      setSmtpStatus(null)
      const res = await apiRequest<{ success: boolean; message: string }>('/settings/smtp/test', {
        method: 'POST',
        body: JSON.stringify({
          smtp_server: settings.smtp_server,
          smtp_port: settings.smtp_port,
          smtp_username: settings.smtp_username,
          smtp_password: settings.smtp_password,
          smtp_tls: settings.smtp_tls,
          test_recipient: testRecipient || settings.smtp_username
        })
      })
      setSmtpStatus(res)
    } catch (err: any) {
      setSmtpStatus({ success: false, message: err.message || 'SMTP connection test failed' })
    } finally {
      setTestingSmtp(false)
    }
  }

  const handleCleanDemoData = async () => {
    try {
      setCleaningData(true)
      const res = await apiRequest<any>('/settings/clean-demo-data', {
        method: 'POST'
      })
      setIsResetDialogOpen(false)
      setMessage({ type: 'success', text: res.message || 'Demo data wiped successfully. System ready for real usage!' })
      setTimeout(() => setMessage(null), 5000)
    } catch (err: any) {
      alert(`Error cleaning data: ${err.message}`)
    } finally {
      setCleaningData(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span>Hardware & System Settings</span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Configure session hours, biometric threshold, Supabase cloud sync, and production reset.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={saving || loading}
          className="shadow-sm"
        >
          <Save className="w-4 h-4 mr-1.5" />
          {saving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </div>

      {message && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center space-x-2 border shadow-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 0: Appearance & Theme */}
        <Card className="p-5 bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-100 dark:border-gray-700 pb-2">
            {isDarkMode ? <Moon className="w-4 h-4 text-primary-500" /> : <Sun className="w-4 h-4 text-amber-500" />}
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
              Appearance & Theme
            </h2>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200/70 dark:border-gray-700">
            <div>
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                Interface Mode: <span className="text-primary-600 dark:text-primary-400 capitalize">{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Switch between high-contrast dark theme and clean light theme.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  !isDarkMode
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isDarkMode
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-indigo-300" />
                <span>Dark</span>
              </button>
            </div>
          </div>
        </Card>

        {/* Section 1: Session Timings */}
        <Card className="p-5 bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-100 dark:border-gray-700 pb-2">
            <Clock className="w-4 h-4 text-primary-600" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
              School / College Session Hours
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-3 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200/70 dark:border-gray-700 space-y-3">
              <span className="text-xs font-bold text-primary-700 dark:text-primary-300 uppercase">
                Morning Session Window
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">Start Time</label>
                  <Input
                    type="time"
                    value={settings.morning_session_start}
                    onChange={(e) => setSettings(p => ({ ...p, morning_session_start: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">End Time</label>
                  <Input
                    type="time"
                    value={settings.morning_session_end}
                    onChange={(e) => setSettings(p => ({ ...p, morning_session_end: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200/70 dark:border-gray-700 space-y-3">
              <span className="text-xs font-bold text-primary-700 dark:text-primary-300 uppercase">
                Afternoon Session Window
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">Start Time</label>
                  <Input
                    type="time"
                    value={settings.afternoon_session_start}
                    onChange={(e) => setSettings(p => ({ ...p, afternoon_session_start: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">End Time</label>
                  <Input
                    type="time"
                    value={settings.afternoon_session_end}
                    onChange={(e) => setSettings(p => ({ ...p, afternoon_session_end: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Section 2: Face Engine & Biometric Thresholds */}
        <Card className="p-5 bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-100 dark:border-gray-700 pb-2">
            <Sliders className="w-4 h-4 text-primary-600" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
              Biometric Face Verification Engine
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Recognition Threshold
                </label>
                <span className="text-xs font-mono font-bold text-primary-600">
                  {settings.recognition_threshold}
                </span>
              </div>
              <input
                type="range"
                min="0.25"
                max="0.80"
                step="0.01"
                value={settings.recognition_threshold}
                onChange={(e) => setSettings(p => ({ ...p, recognition_threshold: parseFloat(e.target.value) }))}
                className="w-full accent-primary-600 cursor-pointer"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Lower = more permissive; Higher = strictly eliminates lookalike faces. Recommended: 0.45 (InsightFace) or 0.363 (SFace).
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Camera Stream Rate (FPS)
              </label>
              <select
                value={settings.stream_fps}
                onChange={(e) => setSettings(p => ({ ...p, stream_fps: parseInt(e.target.value) }))}
                className="w-full text-xs py-2 px-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                <option value="2">2 FPS (Raspberry Pi 3 Low Power)</option>
                <option value="5">5 FPS (Recommended Default)</option>
                <option value="10">10 FPS (High Performance Laptop)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                LCD Display Hardware Mode
              </label>
              <select
                value={settings.lcd_mode}
                onChange={(e) => setSettings(p => ({ ...p, lcd_mode: e.target.value }))}
                className="w-full text-xs py-2 px-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                <option value="parallel">4-bit Parallel (1602A Direct GPIO - Default)</option>
                <option value="i2c">I2C Backpack (PCF8574 0x27)</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Section 3: Supabase Cloud Sync */}
        <Card className="p-5 bg-gradient-to-br from-white to-blue-50/40 dark:from-gray-800 dark:to-gray-800/90 shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
            <div className="flex items-center space-x-2">
              <Cloud className="w-4 h-4 text-primary-600" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                Supabase Cloud Database Sync
              </h2>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500 font-medium">Enable Cloud Sync</span>
              <input
                type="checkbox"
                checked={settings.supabase_enabled}
                onChange={(e) => setSettings(p => ({ ...p, supabase_enabled: e.target.checked }))}
                className="w-4 h-4 accent-primary-600 cursor-pointer"
              />
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Automatically mirror attendance logs and student records to your Supabase PostgreSQL cloud instance.
            Local SQLite continues to run offline if internet drops.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                Supabase Project URL
              </label>
              <Input
                placeholder="https://your-project-id.supabase.co"
                value={settings.supabase_url}
                onChange={(e) => setSettings(p => ({ ...p, supabase_url: e.target.value }))}
                className="text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                Supabase API / Service Key
              </label>
              <Input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                value={settings.supabase_key}
                onChange={(e) => setSettings(p => ({ ...p, supabase_key: e.target.value }))}
                className="text-xs font-mono"
              />
            </div>
          </div>

          {supabaseStatus && (
            <div className="p-2.5 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-mono text-gray-700 dark:text-gray-300">
              {supabaseStatus}
            </div>
          )}

          <div className="flex items-center space-x-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={handleTestSupabase}
              disabled={testingSupabase || !settings.supabase_url}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              {testingSupabase ? 'Testing...' : 'Test Supabase Connection'}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={handleSyncSupabase}
              disabled={syncingSupabase || !settings.supabase_url}
            >
              <Database className="w-3 h-3 mr-1" />
              {syncingSupabase ? 'Syncing...' : 'Sync Local Records to Cloud'}
            </Button>
          </div>
        </Card>

        {/* Section 4: Email & Parent Notifications (SMTP) */}
        <Card className="p-5 bg-gradient-to-br from-white to-indigo-50/30 dark:from-gray-800 dark:to-gray-800/90 shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                Parent Email Notifications & SMTP Setup
              </h2>
            </div>
            <span className="text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-semibold px-2 py-0.5 rounded-full">
              Live Dispatch
            </span>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Automatically sends attendance alerts to parents when their ward's face is scanned and verified.
            Emails are sent directly from your own email account.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Your Email Address (Sender Username)
              </label>
              <Input
                type="email"
                placeholder="yourname@gmail.com"
                value={settings.smtp_username}
                onChange={(e) => setSettings(p => ({ ...p, smtp_username: e.target.value }))}
                className="text-xs"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Parent emails will show this address as the sender.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                App Password / SMTP Password
              </label>
              <Input
                type="password"
                placeholder="16-character Google App Password"
                value={settings.smtp_password}
                onChange={(e) => setSettings(p => ({ ...p, smtp_password: e.target.value }))}
                className="text-xs font-mono"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                For Gmail: Use a 16-character Google App Password (not your normal password).
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                SMTP Server Host
              </label>
              <Input
                placeholder="smtp.gmail.com"
                value={settings.smtp_server}
                onChange={(e) => setSettings(p => ({ ...p, smtp_server: e.target.value }))}
                className="text-xs font-mono"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Gmail: <code className="text-primary-600">smtp.gmail.com</code> • Outlook: <code className="text-primary-600">smtp.office365.com</code>
              </p>
            </div>

            <div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Port
                  </label>
                  <Input
                    type="number"
                    value={settings.smtp_port}
                    onChange={(e) => setSettings(p => ({ ...p, smtp_port: parseInt(e.target.value) || 587 }))}
                    className="text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Security
                  </label>
                  <label className="flex items-center space-x-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.smtp_tls}
                      onChange={(e) => setSettings(p => ({ ...p, smtp_tls: e.target.checked }))}
                      className="w-4 h-4 accent-primary-600"
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300">Enable TLS</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Test Email Bar */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Input
                type="email"
                placeholder="Send test email to (e.g. parent@example.com)"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                className="text-xs flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestSmtp}
                disabled={testingSmtp || !settings.smtp_username || !settings.smtp_password}
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                {testingSmtp ? 'Sending Test...' : 'Send Test Email'}
              </Button>
            </div>

            {smtpStatus && (
              <div className={`mt-2 p-2.5 rounded-lg border text-xs flex items-center space-x-2 ${
                smtpStatus.success
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
              }`}>
                {smtpStatus.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                )}
                <span>{smtpStatus.message}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Section 5: Production Reset & Clean Demo Data */}
        <Card className="p-5 bg-gradient-to-br from-white to-red-50/30 dark:from-gray-800 dark:to-gray-800 border-2 border-red-200 dark:border-red-900/60 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
            <Trash2 className="w-4 h-4" />
            <h2 className="text-sm font-bold uppercase tracking-wider">
              Production Deployment / Clear Demo Data
            </h2>
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-300">
            Ready to deploy for real students? This will remove mock test attendance and dummy student records while
            preserving your administrator (<code className="font-mono bg-white dark:bg-gray-700 px-1 rounded">admin</code>) and teacher (<code className="font-mono bg-white dark:bg-gray-700 px-1 rounded">teacher</code>) accounts, hardware pinouts, and system settings.
          </p>

          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsResetDialogOpen(true)}
              className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/40"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Wipe Demo Data & Prepare for Real Usage
            </Button>
          </div>
        </Card>
      </form>

      {/* Confirmation Dialog */}
      <Dialog
        open={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        title="Confirm Demo Data Cleanup"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Are you sure you want to clear all demo data?
          </p>
          <ul className="text-xs text-gray-500 space-y-1 list-disc pl-4">
            <li>Deletes all dummy students and mock attendance entries.</li>
            <li>Deletes mock face embeddings.</li>
            <li>Keeps your <strong>admin</strong> and <strong>teacher</strong> accounts intact.</li>
            <li>Leaves the system clean for enrolling your real students.</li>
          </ul>

          <div className="flex justify-end space-x-2 pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsResetDialogOpen(false)}
              disabled={cleaningData}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCleanDemoData}
              disabled={cleaningData}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {cleaningData ? 'Cleaning Data...' : 'Yes, Wipe Demo Data'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}