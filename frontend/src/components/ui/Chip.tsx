import React from 'react'

interface ChipProps {
  className?: string
  variant?: 'primary' | 'secondary' | 'tertiary' | 'success' | 'error' | 'warning'
  size?: 'sm' | 'md'
}

export const Chip = ({
  className = '',
  variant = 'secondary',
  size = 'md',
  children
}: ChipProps) => {
  // Variant colors
  const variantClasses = {
    primary: 'bg-primary-100 text-primary-800',
    secondary: 'bg-secondary-100 text-secondary-800',
    tertiary: 'bg-tertiary-100 text-tertiary-800',
    success: 'bg-success-100 text-success-800',
    error: 'bg-error-100 text-error-800',
    warning: 'bg-warning-100 text-warning-800'
  }

  // Size classes
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs rounded',
    md: 'px-3 py-2 text-sm rounded-md'
  }

  return (
    <span
      className={`
        inline-flex items-center
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className || ''}
      `}
    >
      {children}
    </span>
  )
}