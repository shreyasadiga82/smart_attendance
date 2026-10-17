import React, { useState } from 'react'

interface TabsProps {
  className?: string
  children: React.ReactNode
  defaultIndex?: number
}

interface TabListProps {
  className?: string
  children: React.ReactNode
}

interface TabProps {
  className?: string
  children: React.ReactNode
  index?: number
  isActive?: boolean
  onClick?: () => void
}

interface TabPanelProps {
  className?: string
  children: React.ReactNode
}

export const Tabs = ({
  className = '',
  children,
  defaultIndex = 0
}: TabsProps) => {
  const [activeIndex, setActiveIndex] = useState<number>(defaultIndex)

  return (
    <div className={className}>
      <TabList className="border-b border-gray-200 dark:border-gray-700">
        {React.Children.map(children, (child, index) => {
          if (React.isValidElement(child) && child.type === Tab) {
            return React.cloneElement(child, {
              index,
              isActive: index === activeIndex,
              onClick: () => setActiveIndex(index)
            })
          }
          return child
        })}
      </TabList>
      <div className="mt-4">
        {React.Children.map(children, (child, index) => {
          if (React.isValidElement(child) && child.type === TabPanel) {
            return index === activeIndex ? child : null
          }
          return child
        })}
      </div>
    </div>
  )
}

export const TabList = ({ className = '', children }: TabListProps) => {
  return (
    <div className={`${className} flex`}>
      {children}
    </div>
  )
}

export const Tab = ({
  className = '',
  children,
  index,
  isActive,
  onClick
}: TabProps) => {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-2 text-sm font-medium
        ${isActive
          ? 'border-b-2 border-primary-600 text-primary-600'
          : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border-b-transparent'}
      `}
      {...(className && { className })}
    >
      {children}
    </button>
  )
}

export const TabPanel = ({ className = '', children }: TabPanelProps) => {
  return (
    <div className={className}>
      {children}
    </div>
  )
}