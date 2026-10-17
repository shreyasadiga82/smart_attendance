import React from 'react'

interface AvatarProps {
  src?: string
  alt?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  name?: string // For fallback initials
  className?: string
}

export const Avatar = ({
  src,
  alt,
  size = 'md',
  name,
  className = ''
}: AvatarProps) => {
  // Size mapping
  const sizeMap = {
    xs: 'h-6 w-6',
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  }

  const sizeClass = sizeMap[size] || sizeMap.md

  return (
    <div className={`${sizeClass} ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt || 'Avatar'}
          className="object-cover rounded-full"
        />
      ) : (
        <div className="flex items-center justify-center bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium">
          {name ? name.charAt(0) : '?'}
        </div>
      )}
    </div>
  )
}