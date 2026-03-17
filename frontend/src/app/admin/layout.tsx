'use client'
import { useAuthStore } from '@/store/auth.store'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Shield } from 'lucide-react'
import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return }
    if (user.role !== 'ADMIN') router.push('/main/dashboard')
  }, [user])

  if (!user || user.role !== 'ADMIN') return null

  return (
    <div className="min-h-screen bg-[var(--bg-tertiary)]">
      <div className="bg-[var(--bg)] border-b border-[var(--border)] px-6 py-3 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
            <span className="text-white font-bold text-xs">S</span>
          </div>
          <span className="font-display font-bold text-[var(--text)]">SCS</span>
        </Link>
        <span className="text-[var(--border-strong)]">/</span>
        <div className="flex items-center gap-1.5 text-sm text-red-500 font-medium">
          <Shield size={14} />
          <span>Admin Panel</span>
        </div>
        <div className="mr-auto">
          <Link href="/main/dashboard" className="btn-ghost text-sm px-3 py-1.5">
            العودة للمنصة
          </Link>
        </div>
      </div>
      {children}
    </div>
  )
}
