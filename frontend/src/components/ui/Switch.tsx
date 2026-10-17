import React from 'react'

interface SwitchProps {
  label?: string
  checked?: boolean
  onChange?: (checked: boolean) => void
  checkedChildren?: React.ReactNode
  uncheckedChildren?: React.ReactNode
  className?: string
}

export const Switch = ({
  label,
  checked = false,
  onChange,
  checkedChildren,
  uncheckedChildren,
  className = ''
}: SwitchProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.checked
    onChange?.(value)
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {label && (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
      )}
      <label className="relative inline-flex shrink-0 cursor-pointer h-6 w-11 items-center rounded-full border-2 border-transparent transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-600 focus-within:ring-offset-2" style={{ backgroundColor: checked ? 'var(--color-primary-600, #4f46e5)' : '#e5e7eb' }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          className="sr-only"
        />
        <span
          className={`pointer-events-start block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </label>
      {(checkedChildren || uncheckedChildren) && (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {checked ? checkedChildren : uncheckedChildren}
        </span>
      )}
    </div>
  )
}