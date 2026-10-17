import React, { useEffect } from 'react'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
}

export const Dialog = ({
  open,
  onClose,
  title,
  children,
  className = ''
}: DialogProps) => {
  // Prevent scrolling when dialog is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-gray-500 bg-opacity-50"
        onClick={onClose}
      />
      {/* Dialog */}
      <div className="fixed z-50 inset-0 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 pointer-events-none">
          <div className={`relative pointer-events-auto w-full ${className || 'max-w-md'}`}>
            {/* Content */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl px-4 pt-5 pb-4">
              <div className="flex justify-between items-start pb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {title}
                </h3>
                <button
                  className="rounded-md p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700"
                  onClick={onClose}
                  aria-label="Close"
                >
                  {/* We'll use an 'x' icon for simplicity */}
                  <span className="sr-only">Close</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                {children}
              </div>
            </div>
            {/* Resize handle - optional */}
          </div>
        </div>
      </div>
    </>
  )
}