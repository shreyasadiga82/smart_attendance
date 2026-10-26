import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

interface WebSocketContextType {
  socket: WebSocket | null
  connected: boolean
  connect: () => void
  disconnect: () => void
  sendMessage: (data: any) => void
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export const useWebSocket = () => {
  const context = useContext(WebSocketContext)
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}

export const WebSocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [connected, setConnected] = useState<boolean>(false)

  // Get WebSocket URL from environment or default to same origin
  const getWsUrl = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/ws/recognition`
  }

  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isConnectingRef = useRef<boolean>(false)

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (socketRef.current) {
      socketRef.current.onclose = null
      socketRef.current.onerror = null
      socketRef.current.onopen = null
      socketRef.current.onmessage = null
      try {
        socketRef.current.close()
      } catch (e) {
        // ignore close errors
      }
      socketRef.current = null
    }
    isConnectingRef.current = false
    setConnected(false)
    setSocket(null)
  }, [])

  const connect = useCallback(() => {
    // If already open or connecting, do not open another socket
    if (
      socketRef.current &&
      (socketRef.current.readyState === WebSocket.OPEN ||
        socketRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return
    }

    if (isConnectingRef.current) return
    isConnectingRef.current = true

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    try {
      const wsUrl = getWsUrl()
      const ws = new WebSocket(wsUrl)
      socketRef.current = ws

      ws.onopen = () => {
        isConnectingRef.current = false
        setConnected(true)
        setSocket(ws)
      }

      ws.onclose = () => {
        isConnectingRef.current = false
        setConnected(false)
        setSocket(null)
        socketRef.current = null
      }

      ws.onerror = (error) => {
        isConnectingRef.current = false
        console.warn('WebSocket connection error:', error)
        setConnected(false)
      }
    } catch (err) {
      isConnectingRef.current = false
      console.warn('Failed to initialize WebSocket:', err)
    }
  }, [])

  const sendMessage = useCallback((data: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data))
    } else {
      console.warn('WebSocket is not connected')
    }
  }, [])

  // Cleanup on unmount of provider only
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return (
    <WebSocketContext.Provider value={{ socket, connected, connect, disconnect, sendMessage }}>
      {children}
    </WebSocketContext.Provider>
  )
}