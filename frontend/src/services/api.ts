import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import toast from 'react-hot-toast'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// ─── REQUEST INTERCEPTOR ──────────────────────────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken')
      if (token) config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ─── RESPONSE INTERCEPTOR ─────────────────────────────────
let isRefreshing = false
let failedQueue: Array<{ resolve: (v: any) => void; reject: (e: any) => void }> = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)))
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ error: string; code?: string }>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch(Promise.reject)
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (!refreshToken) throw new Error('No refresh token')

        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken })
        localStorage.setItem('accessToken', data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)

        api.defaults.headers.Authorization = `Bearer ${data.accessToken}`
        processQueue(null, data.accessToken)
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        window.location.href = '/auth/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    const message = error.response?.data?.error || error.message || 'Something went wrong'
    if (error.response?.status !== 401) {
      toast.error(message)
    }

    return Promise.reject(error)
  }
)

// ─── TYPED API METHODS ────────────────────────────────────
export const authAPI = {
  register: (data: { username: string; email: string; password: string; role?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data: { token: string; password: string }) =>
    api.post('/auth/reset-password', data),
  verifyEmail: (token: string) => api.get(`/auth/verify-email/${token}`),
}

export const userAPI = {
  getProfile: (username: string) => api.get(`/users/${username}`),
  updateProfile: (data: any) => api.patch('/users/profile', data),
  updateSettings: (data: any) => api.patch('/users/settings', data),
  uploadAvatar: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/upload/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  uploadCover: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/upload/cover', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  follow: (userId: string) => api.post(`/users/${userId}/follow`),
  unfollow: (userId: string) => api.delete(`/users/${userId}/follow`),
  getFollowers: (username: string) => api.get(`/users/${username}/followers`),
  getFollowing: (username: string) => api.get(`/users/${username}/following`),
  block: (userId: string) => api.post(`/users/${userId}/block`),
  getSessions: () => api.get('/users/sessions'),
  revokeSession: (sessionId: string) => api.delete(`/users/sessions/${sessionId}`),
  getBookmarks: () => api.get('/users/bookmarks'),
  addBookmark: (resourceType: string, resourceId: string) =>
    api.post('/users/bookmarks', { resourceType, resourceId }),
  removeBookmark: (resourceId: string, resourceType: string) =>
    api.delete(`/users/bookmarks/${resourceId}?type=${resourceType}`),
  searchUsers: (q: string) => api.get('/users/search', { params: { q } }),
}

export const communityAPI = {
  getAll: (params?: any) => api.get('/communities', { params }),
  getBySlug: (slug: string) => api.get(`/communities/${slug}`),
  create: (data: any) => api.post('/communities', data),
  update: (id: string, data: any) => api.patch(`/communities/${id}`, data),
  delete: (id: string) => api.delete(`/communities/${id}`),
  join: (id: string) => api.post(`/communities/${id}/join`),
  leave: (id: string) => api.delete(`/communities/${id}/leave`),
  getMembers: (id: string, params?: any) => api.get(`/communities/${id}/members`, { params }),
  getChannels: (id: string) => api.get(`/communities/${id}/channels`),
  createChannel: (id: string, data: any) => api.post(`/communities/${id}/channels`, data),
  getChannelMessages: (channelId: string, params?: any) =>
    api.get(`/communities/channels/${channelId}/messages`, { params }),
}

export const chatAPI = {
  getConversations: () => api.get('/chat/conversations'),
  getOrCreateConversation: (userId: string) =>
    api.post('/chat/conversations', { userId }),
  getMessages: (conversationId: string, params?: any) =>
    api.get(`/chat/conversations/${conversationId}/messages`, { params }),
  createGroup: (data: { name: string; memberIds: string[] }) =>
    api.post('/chat/groups', data),
  sendMessage: (conversationId: string, data: any) =>
    api.post(`/chat/conversations/${conversationId}/messages`, data),
}

export const courseAPI = {
  getAll: (params?: any) => api.get('/courses', { params }),
  getBySlug: (slug: string) => api.get(`/courses/${slug}`),
  create: (data: any) => api.post('/courses', data),
  update: (id: string, data: any) => api.patch(`/courses/${id}`, data),
  delete: (id: string) => api.delete(`/courses/${id}`),
  enroll: (id: string) => api.post(`/courses/${id}/enroll`),
  getProgress: (id: string) => api.get(`/courses/${id}/progress`),
  updateLessonProgress: (lessonId: string, data: any) =>
    api.post(`/courses/lessons/${lessonId}/progress`, data),
  addReview: (id: string, data: { rating: number; content?: string }) =>
    api.post(`/courses/${id}/reviews`, data),
  getMyCreated: () => api.get('/courses/instructor/mine'),
  getInstructorCourses: () => api.get('/courses/instructor/mine'),
  publish: (id: string) => api.post(`/courses/${id}/publish`),
  addModule: (courseId: string, data: { title: string; description?: string }) => api.post(`/courses/${courseId}/modules`, data),
  addLesson: (moduleId: string, data: any) => api.post(`/courses/modules/${moduleId}/lessons`, data),
}

export const bookAPI = {
  getAll: (params?: any) => api.get('/books', { params }),
  getBySlug: (slug: string) => api.get(`/books/${slug}`),
  upload: (data: FormData) =>
    api.post('/books', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  purchase: (id: string) => api.post(`/books/${id}/purchase`),
  getMyLibrary: () => api.get('/books/library'),
}

export const aiAPI = {
  getConversations: () => api.get('/ai/conversations'),
  createConversation: (title?: string) => api.post('/ai/conversations', { title }),
  getMessages: (conversationId: string) =>
    api.get(`/ai/conversations/${conversationId}/messages`),
  sendMessage: (conversationId: string, data: {
    message: string
    taskType?: string
    preferredModel?: string
  }) => api.post(`/ai/conversations/${conversationId}/messages`, data),
  deleteConversation: (id: string) => api.delete(`/ai/conversations/${id}`),
  getUsage: () => api.get('/ai/usage'),
}

export const notificationAPI = {
  getAll: (params?: any) => api.get('/notifications', { params }),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  getSettings: () => api.get('/notifications/settings'),
  updateSettings: (data: any) => api.patch('/notifications/settings', data),
}

export const paymentAPI = {
  createCheckout: (data: { itemType: 'course' | 'book' | 'subscription'; itemId: string }) =>
    api.post('/payments/checkout', data),
  getHistory: () => api.get('/payments/history'),
  getSubscription: () => api.get('/payments/subscription'),
  cancelSubscription: () => api.delete('/payments/subscription'),
}

export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params?: any) => api.get('/admin/users', { params }),
  banUser: (userId: string, reason: string) =>
    api.post(`/admin/users/${userId}/ban`, { reason }),
  unbanUser: (userId: string) => api.delete(`/admin/users/${userId}/ban`),
  getCourses: (params?: any) => api.get('/admin/courses', { params }),
  approveCourse: (id: string) => api.patch(`/admin/courses/${id}/approve`),
  rejectCourse: (id: string, reason: string) =>
    api.patch(`/admin/courses/${id}/reject`, { reason }),
  getAds: () => api.get('/admin/ads'),
  createAd: (data: any) => api.post('/admin/ads', data),
  updateAd: (id: string, data: any) => api.patch(`/admin/ads/${id}`, data),
  getSecurityLogs: (params?: any) => api.get('/admin/security-logs', { params }),
  getAiUsage: () => api.get('/admin/ai-usage'),
}

export const searchAPI = {
  search: (q: string) => api.get('/search', { params: { q } }),
  suggestions: (q: string) => api.get('/search/suggestions', { params: { q } }),
}

// Extend userAPI with missing methods
export const bookmarkAPI = {
  getAll: () => api.get('/users/bookmarks'),
  add: (resourceType: string, resourceId: string) => api.post('/users/bookmarks', { resourceType, resourceId }),
  remove: (resourceId: string, resourceType: string) => api.delete(`/users/bookmarks/${resourceId}?type=${resourceType}`),
}
