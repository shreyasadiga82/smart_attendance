import React from 'react'
import { Outlet } from 'react-router-dom'
import { TopBar } from './TopBar'

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <TopBar />
      <div className="flex flex-1">
        {children || <Outlet />}
      </div>
    </div>
  )
}