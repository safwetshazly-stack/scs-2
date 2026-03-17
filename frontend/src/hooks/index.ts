'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { notificationAPI } from '@/services/api'
import { useAuthStore } from '@/store/auth.store'
import { useNotificationStore } from '@/store/notification.store'
import { useSocket } from '@/components/providers'

// ─── useRequireAuth ───────────────────────────────────────
export function useRequireAuth() {
  const { user, isAuthenticated } = useAuthStore()
  const router = useRouter()
  useEffect(() => {
    if (!isAuthenticated()) router.push('/auth/login')
  }, [])
  return { user }
}

// ─── useRequireRole ───────────────────────────────────────
export function useRequireRole(role: 'ADMIN' | 'INSTRUCTOR') {
  const { user } = useAuthStore()
  const router = useRouter()
  useEffect(() => {
    if (!user) { router.push('/auth/login'); return }
    if (role === 'ADMIN' && user.role !== 'ADMIN') router.push('/main/dashboard')
    if (role === 'INSTRUCTOR' && !['INSTRUCTOR', 'ADMIN'].includes(user.role)) router.push('/main/dashboard')
  }, [user])
  return { user }
}

// ─── useDebounce ─────────────────────────────────────────
export function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

// ─── useLocalStorage ─────────────────────────────────────
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initial
    try { const stored = localStorage.getItem(key); return stored ? JSON.parse(stored) : initial }
    catch { return initial }
  })
  const set = useCallback((val: T | ((prev: T) => T)) => {
    setValue(prev => {
      const next = typeof val === 'function' ? (val as (p: T) => T)(prev) : val
      if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(next))
      return next
    })
  }, [key])
  return [value, set] as const
}

// ─── useNotifications ────────────────────────────────────
export function useNotifications() {
  const { setUnreadCount } = useNotificationStore()
  const socket = useSocket()
  const qc = useQueryClient()
  const { user } = useAuthStore()

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationAPI.getAll({ limit: 10 }).then(r => r.data),
    enabled: !!user,
    refetchInterval: 60000,
  })

  useEffect(() => {
    if (data?.unreadCount !== undefined) setUnreadCount(data.unreadCount)
  }, [data?.unreadCount])

  useEffect(() => {
    if (!socket) return
    socket.on('notification:new', () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    })
    return () => { socket.off('notification:new') }
  }, [socket])

  return {
    notifications: data?.notifications || [],
    unreadCount: data?.unreadCount || 0,
  }
}

// ─── useOnlineUsers ──────────────────────────────────────
export function useOnlineUsers() {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const socket = useSocket()

  useEffect(() => {
    if (!socket) return
    socket.on('user:online', ({ userId, online }: { userId: string; online: boolean }) => {
      setOnlineUsers(prev => {
        const next = new Set(prev)
        if (online) next.add(userId)
        else next.delete(userId)
        return next
      })
    })
    return () => { socket.off('user:online') }
  }, [socket])

  return { isOnline: (userId: string) => onlineUsers.has(userId) }
}

// ─── useIntersectionObserver ─────────────────────────────
export function useIntersectionObserver(
  callback: () => void,
  options?: IntersectionObserverInit
) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) callback()
    }, options)
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [callback])
  return ref
}

// ─── useFileUpload ───────────────────────────────────────
export function useFileUpload() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const upload = async (file: File, type: 'avatar' | 'cover' | 'message' | 'video' | 'book' | 'ai-file') => {
    setUploading(true)
    setProgress(0)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { default: axios } = await import('axios')
      const token = localStorage.getItem('accessToken')
      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/upload/${type}`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => setProgress(Math.round((e.loaded / (e.total || 1)) * 100)),
        }
      )
      return data.url as string
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  return { upload, uploading, progress }
}

// ─── useMediaQuery ───────────────────────────────────────
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const media = window.matchMedia(query)
    setMatches(media.matches)
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [query])
  return matches
}

export const useIsMobile = () => useMediaQuery('(max-width: 768px)')

// ─── useClickOutside ─────────────────────────────────────
export function useClickOutside<T extends HTMLElement>(callback: () => void) {
  const ref = useRef<T>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) callback()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [callback])
  return ref
}

// ─── useKeyPress ─────────────────────────────────────────
export function useKeyPress(key: string, callback: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === key) callback() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [key, callback])
}

// ─── useCopyToClipboard ──────────────────────────────────
export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false)
  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return { copy, copied }
}
