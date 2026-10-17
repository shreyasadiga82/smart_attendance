import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = ({
  label,
  error,
  helperText,
  className,
  ...props
}: InputProps) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          className={`
            block w-full rounded-md border-0 py-1.5 pl-3 pr-9
            ring-1 ring-inset ring-gray-300 dark:ring-gray-600
            placeholder-gray-400 dark:placeholder-gray-500
            focus:ring-2 focus:ring-inset focus:ring-primary-600
            sm:text-sm sm:leading-6
            ${className || ''}
          `}
          {...props}
        />
        {props.type === 'password' && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center pr-3"
            onClick={(e) => {
              e.preventDefault()
              const target = e.target as HTMLButtonElement
              const input = target.previousElementSibling as HTMLInputElement
              if (input) {
                input.type = input.type === 'password' ? 'text' : 'password'
              }
            }}
          >
            {props.type === 'password' ? (
              <span className="sr-only">Show password</span>
            ) : (
              <span className="sr-only">Hide password</span>
            )}
          </button>
        )}
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