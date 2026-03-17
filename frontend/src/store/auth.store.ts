import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { authAPI } from '@/services/api'

interface User {
  id: string
  username: string
  email: string
  role: 'USER' | 'INSTRUCTOR' | 'ADMIN'
  avatar?: string
  emailVerified: boolean
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isLoading: boolean

  login: (email: string, password: string) => Promise<void>
  register: (data: { username: string; email: string; password: string; role?: string }) => Promise<string>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  setTokens: (access: string, refresh: string) => void
  isAuthenticated: () => boolean
  isAdmin: () => boolean
  isInstructor: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const { data } = await authAPI.login({ email, password })
          localStorage.setItem('accessToken', data.accessToken)
          localStorage.setItem('refreshToken', data.refreshToken)
          set({
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          })
        } finally {
          set({ isLoading: false })
        }
      },

      register: async (formData) => {
        set({ isLoading: true })
        try {
          const { data } = await authAPI.register(formData)
          return data.message
        } finally {
          set({ isLoading: false })
        }
      },

      logout: async () => {
        const { refreshToken } = get()
        try {
          if (refreshToken) await authAPI.logout(refreshToken)
        } finally {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          set({ user: null, accessToken: null, refreshToken: null })
        }
      },

      refreshUser: async () => {
        try {
          const { data } = await authAPI.getMe()
          set({ user: data })
        } catch {
          get().logout()
        }
      },

      setTokens: (access, refresh) => {
        localStorage.setItem('accessToken', access)
        localStorage.setItem('refreshToken', refresh)
        set({ accessToken: access, refreshToken: refresh })
      },

      isAuthenticated: () => !!get().user,
      isAdmin: () => get().user?.role === 'ADMIN',
      isInstructor: () => ['INSTRUCTOR', 'ADMIN'].includes(get().user?.role || ''),
    }),
    {
      name: 'scs-auth',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
)
