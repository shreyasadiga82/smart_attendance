import React, { useEffect, useRef } from 'react'

interface ToastProps {
  message: string
  variant?: 'success' | 'error' | 'warning' | 'info'
  onClose: () => void
  className?: string
}

export const Toast = ({
  message,
  variant = 'info',
  onClose,
  className = ''
}: ToastProps) => {
  const toastRef = useRef<HTMLDivElement>(null)

  // Auto-remove after 5 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      onClose()
    }, 5000)
    return () => clearTimeout(timeout)
  }, [onClose])

  // Variant colors
  const variantClasses = {
    success: 'bg-success-900 text-success-100',
    error: 'bg-error-900 text-error-100',
    warning: 'bg-warning-900 text-warning-100',
    info: 'bg-primary-900 text-primary-100'
  }

  return (
    <div
      ref={toastRef}
      className={`
        fixed bottom-4 right-4 z-50 flex w-[300px] items-center p-4
        rounded-lg shadow-lg
        ${variantClasses[variant]}
        ${className || ''}
        animate-pulse
      `}
      role="alert"
    >
      <div className="flex-shrink-0">
        {/* We'll use a simple checkmark or exclamation for now */}
        {variant === 'success' && (
          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        )}
        {variant === 'error' && (
          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        {variant === 'warning' && (
          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3.088a6.018 6.018 0 00-.732-2.912A5.99 5.99 0 0020.098 9h-8.098c-1.055 0-1.628.81-1.441 1.948a12.07 12.07 0 01-.732 2.912a12.07 12.07 0 00-.732 2.912z" />
          </svg>
        )}
        {variant === 'info' && (
          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </div>
      <div className="ml-3 text-sm font-medium">
        {message}
        <button
          type="button"
          className="ml-2 flex h-5 w-5 items-center justify-center rounded-md hover:bg-white/20"
          onClick={onClose}
          aria-label="Close"
        >
          <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}