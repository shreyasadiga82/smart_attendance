import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { Shield, GraduationCap, ArrowRight, Sparkles } from 'lucide-react'
import { Toast } from '../components/ui/Toast'

export const Login: React.FC = () => {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastVariant, setToastVariant] = useState<'success' | 'error' | 'info'>('info')

  // If already logged in, redirect immediately
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true })
    }
  }, [user, navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: username.trim(),
          password: password
        })
      })

      if (!response.ok) {
        let errMsg = 'Invalid username or password'
        try {
          const errData = await response.json()
          if (errData.detail) errMsg = errData.detail
        } catch {}
        throw new Error(errMsg)
      }

      const data = await response.json()
      login(data.access_token)
      setToastMessage(`Welcome back, ${username}!`)
      setToastVariant('success')
      setShowToast(true)

      // Direct navigation to dashboard based on authenticated role
      navigate('/', { replace: true })
    } catch (err: any) {
      const msg = err.message || 'Login failed. Please check your credentials.'
      setError(msg)
      setToastMessage(msg)
      setToastVariant('error')
      setShowToast(true)
    } finally {
      setLoading(false)
    }
  }

  const fillCredentials = (user: string, pass: string) => {
    setUsername(user)
    setPassword(pass)
    setError(null)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
            SA
          </div>
          <h2 className="mt-4 text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
            Smart Attendance
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Sign in to access your dashboard
          </p>
        </div>

        <Card className="p-8 shadow-xl border border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-2xl">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                Username
              </label>
              <Input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                Password
              </label>
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2 justify-center font-semibold text-sm shadow-md"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Authenticating...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>

          {/* Quick Credential Presets */}
          <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-2.5">
              Select account preset:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillCredentials('admin', 'admin123')}
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl text-xs font-semibold border border-primary-500/30 bg-primary-500/5 hover:bg-primary-500/10 text-primary-700 dark:text-primary-300 transition-colors"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin Login</span>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('teacher', 'teacher123')}
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl text-xs font-semibold border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 transition-colors"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Teacher Login</span>
              </button>
            </div>
          </div>
        </Card>

        {showToast && (
          <Toast
            message={toastMessage}
            variant={toastVariant}
            onClose={() => setShowToast(false)}
          />
        )}
      </div>
    </div>
  )
}