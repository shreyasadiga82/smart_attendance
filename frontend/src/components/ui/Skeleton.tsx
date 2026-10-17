import React from 'react'

interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
  variant?: 'text' | 'circular' | 'rectangular'
}

export const Skeleton = ({
  className = '',
  width = '100%',
  height = '1rem',
  variant = 'rectangular'
}: SkeletonProps) => {
  return (
    <div
      className={`animate-pulse bg-gray-300 dark:bg-gray-600 rounded ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height
      }}
    >
      {variant === 'circular' && (
        <div className="h-full w-full rounded-full" />
      )}
      {variant === 'rectangular' && (
        <div className="h-full w-full" />
      )}
      {variant === 'text' && (
        <div className="h-full w-full" />
      )}
    </div>
  )
}