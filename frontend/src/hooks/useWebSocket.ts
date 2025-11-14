import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useToast } from './use-toast'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export function useWebSocket(userId: string | null, onUpdate?: () => void) {
  const [connected, setConnected] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (!userId) return

    // Connect to WebSocket server
    const socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('WebSocket connected')
      setConnected(true)
      
      // Join user's room
      socket.emit('join-user-room', userId)
    })

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected')
      setConnected(false)
    })

    socket.on('sync-complete', (data: { service: string; result: any }) => {
      console.log('Sync complete:', data)
      setSyncing(false)
      toast({
        title: 'Sync Complete',
        description: `Synced ${data.service} successfully`,
        duration: 3000,
      })
      onUpdate?.()
    })

    socket.on('sync-error', (data: { service: string; error: string }) => {
      console.error('Sync error:', data)
      setSyncing(false)
      toast({
        title: 'Sync Error',
        description: `Failed to sync ${data.service}: ${data.error}`,
        variant: 'destructive',
        duration: 5000,
      })
    })

    socket.on('context-update', (data: { context: any; action: string }) => {
      console.log('Context updated:', data)
      toast({
        title: 'Update',
        description: `Context ${data.action}`,
        duration: 2000,
      })
      onUpdate?.()
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [userId, onUpdate, toast])

  const requestSync = (service?: string) => {
    if (!socketRef.current || !userId) return
    
    setSyncing(true)
    socketRef.current.emit('request-sync', { userId, service })
  }

  return {
    connected,
    syncing,
    requestSync,
  }
}

