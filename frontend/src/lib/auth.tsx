import React, { createContext, useContext, useState, useEffect } from 'react'
import { jwtDecode } from 'jwt-decode'

export interface User {
  id: number
  username: string
  name?: string
  email?: string
  isActive: boolean
  isAdmin: boolean
  role: 'admin' | 'teacher'
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (token: string) => void
  logout: () => void
  switchRole: (role: 'admin' | 'teacher') => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)

  const parseUserFromToken = (tok: string): User => {
    const decoded: any = jwtDecode(tok)
    const uname = decoded.username || decoded.sub || 'admin'
    const role: 'admin' | 'teacher' =
      decoded.role || (decoded.is_admin === false || uname === 'teacher' ? 'teacher' : 'admin')
    const isAdmin = role === 'admin'

    return {
      id: decoded.id || 1,
      username: uname,
      name: uname.charAt(0).toUpperCase() + uname.slice(1),
      email: decoded.email || `${uname}@school.edu`,
      isActive: decoded.isActive ?? true,
      isAdmin,
      role
    }
  }

  // Check for token in localStorage on initial load
  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    if (storedToken) {
      setToken(storedToken)
      try {
        const u = parseUserFromToken(storedToken)
        setUser(u)
      } catch (error) {
        console.error('Failed to decode token', error)
        logout()
      }
    }
  }, [])

  const login = (newToken: string) => {
    localStorage.setItem('token', newToken)
    setToken(newToken)
    try {
      const u = parseUserFromToken(newToken)
      setUser(u)
    } catch (error) {
      console.error('Failed to decode token', error)
      logout()
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  const switchRole = (newRole: 'admin' | 'teacher') => {
    if (!user) return
    setUser({
      ...user,
      role: newRole,
      isAdmin: newRole === 'admin'
    })
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  )
}