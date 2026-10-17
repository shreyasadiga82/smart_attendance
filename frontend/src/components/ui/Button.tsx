import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'success' | 'error' | 'warning'
  size?: 'sm' | 'md' | 'lg'
  block?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    variant = 'primary',
    size = 'md',
    block = false,
    className,
    ...props
  }, ref) => {
    // Variant colors
    const variantClasses = {
      primary: 'bg-primary-600 text-primary-100 hover:bg-primary-700',
      secondary: 'bg-secondary-600 text-secondary-100 hover:bg-secondary-700',
      tertiary: 'bg-tertiary-600 text-tertiary-100 hover:bg-tertiary-700',
      success: 'bg-success-600 text-success-100 hover:bg-success-700',
      error: 'bg-error-600 text-error-100 hover:bg-error-700',
      warning: 'bg-warning-600 text-warning-100 hover:bg-warning-700'
    }

    // Size classes
    const sizeClasses = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-3 text-base',
      lg: 'px-5 py-4 text-lg'
    }

    // Block class
    const blockClass = block ? 'w-full' : ''

    return (
      <button
        ref={ref}
        className={`
          flex items-center justify-center rounded-md font-medium transition-colors
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${blockClass}
          ${className || ''}
        `}
        {...props}
      >
        {props.children}
      </button>
    )
  }
)

Button.displayName = 'Button'