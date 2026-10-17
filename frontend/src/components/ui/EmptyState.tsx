import React from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  imageUrl?: string // Optional illustration
}

export const EmptyState = ({
  title,
  description,
  action,
  className = '',
  imageUrl
}: EmptyStateProps) => {
  return (
    <div className={`text-center py-12 ${className}`}>
      {imageUrl ? (
        <img src={imageUrl} alt="Empty state" className="mx-auto mb-6 h-48 w-auto" />
      ) : (
        <div className="mx-auto mb-6 h-48 w-48 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
          {/* Default illustration - a simple graphic */}
          <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m2 0a9 9 0 11-18 0 9 9 0 0018 0z" />
          </svg>
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
        {title}
      </h3>
      {description && (
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          {description}
        </p>
      )}
      {action && (
        <div className="justify-center">{action}</div>
      )}
    </div>
  )
}