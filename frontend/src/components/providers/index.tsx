'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect, createContext, useContext } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/store/auth.store'

// ─── SOCKET CONTEXT ───────────────────────────────────────
const SocketContext = createContext<Socket | null>(null)
export const useSocket = () => useContext(SocketContext)

// ─── SOCKET PROVIDER ──────────────────────────────────────
function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const { user, accessToken } = useAuthStore()

  useEffect(() => {
    if (!user || !accessToken) {
      if (socket) { socket.disconnect(); setSocket(null) }
      return
    }

    const s = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000', {
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    s.on('connect', () => console.log('Socket connected'))
    s.on('disconnect', () => console.log('Socket disconnected'))
    s.on('connect_error', (err) => console.error('Socket error:', err.message))

    // Keep-alive
    const interval = setInterval(() => { if (s.connected) s.emit('ping:presence') }, 60000)

    setSocket(s)
    return () => { s.disconnect(); clearInterval(interval) }
  }, [user?.id, accessToken])

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
}

// ─── MAIN PROVIDERS ───────────────────────────────────────
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000,
          retry: (count, error: any) => {
            if ([401, 403, 404].includes(error?.response?.status)) return false
            return count < 2
          },
          refetchOnWindowFocus: false,
        },
        mutations: { retry: false },
      },
    })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <SocketProvider>{children}</SocketProvider>
    </QueryClientProvider>
  )
}
