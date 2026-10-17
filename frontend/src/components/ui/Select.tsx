import React from 'react'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  helperText?: string
}

export const Select = ({
  label,
  error,
  helperText,
  className,
  ...props
}: SelectProps) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="relative">
        <select
          className={`
            block w-full rounded-md border-0 py-1.5 pl-3 pr-9
            ring-1 ring-inset ring-gray-300 dark:ring-gray-600
            placeholder-gray-400 dark:placeholder-gray-500
            focus:ring-2 focus:ring-inset focus:ring-primary-600
            sm:text-sm sm:leading-6
            ${className || ''}
          `}
          {...props}
        >
          {/* Options will be passed as children */}
        </select>
      </div>
      {error && (
        <p className="mt-1 text-sm text-error-600 dark:text-error-400">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
      )}
    </div>
  )
}