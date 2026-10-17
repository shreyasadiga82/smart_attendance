import React from 'react'

interface CardProps {
  className?: string
  header?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
}

export const Card = ({
  className = '',
  header,
  footer,
  children
}: CardProps) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-md ${className}`}>
      {header && <div className="px-6 py-4 border-b dark:border-gray-700">{header}</div>}
      <div className="px-6 py-4">{children}</div>
      {footer && <div className="px-6 py-4 border-t dark:border-gray-700">{footer}</div>}
    </div>
  )
}