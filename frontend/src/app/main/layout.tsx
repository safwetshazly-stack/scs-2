'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { useAuthStore } from '@/store/auth.store'
import {
  LayoutDashboard, Users, MessageCircle, BookOpen,
  Bot, Library, Settings, LogOut, Bell, Search,
  Sun, Moon, Menu, X, ChevronLeft, ShieldCheck,
  TrendingUp, Bookmark
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotificationStore } from '@/store/notification.store'

const sidebarItems = [
  { icon: LayoutDashboard, label: 'الرئيسية', href: '/main/dashboard' },
  { icon: Users, label: 'المجتمعات', href: '/main/communities' },
  { icon: MessageCircle, label: 'الرسائل', href: '/main/chat', badge: 'messages' },
  { icon: BookOpen, label: 'الكورسات', href: '/main/courses' },
  { icon: Library, label: 'الكتب', href: '/main/books' },
  { icon: Bot, label: 'SCS AI', href: '/main/ai', highlight: true },
  { icon: TrendingUp, label: 'التقدم', href: '/main/progress' },
  { icon: Bookmark, label: 'المحفوظات', href: '/main/bookmarks' },
]

const bottomItems = [
  { icon: Settings, label: 'الإعدادات', href: '/main/settings' },
]

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!user) router.push('/auth/login')
  }, [user])

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  if (!user) return null

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside className={cn(
      'flex flex-col h-full bg-[var(--bg)] border-l border-[var(--border)] transition-all duration-300',
      mobile ? 'w-72' : sidebarOpen ? 'w-64' : 'w-16'
    )}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-[var(--border)] h-16">
        <Link href="/main/dashboard" className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-display font-bold text-xs">S</span>
          </div>
          {(sidebarOpen || mobile) && (
            <span className="font-display font-bold text-[var(--text)] truncate">SCS</span>
          )}
        </Link>
        {!mobile && (
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="btn-ghost p-1.5 rounded-lg flex-shrink-0">
            <ChevronLeft size={16} className={cn('transition-transform', !sidebarOpen && 'rotate-180')} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto no-scrollbar">
        {sidebarItems.map(({ icon: Icon, label, href, highlight }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group',
                isActive
                  ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
                  : highlight
                    ? 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text)]'
              )}
              title={!sidebarOpen && !mobile ? label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {(sidebarOpen || mobile) && (
                <span className="text-sm font-medium truncate">{label}</span>
              )}
              {isActive && (sidebarOpen || mobile) && (
                <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mr-auto flex-shrink-0" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-[var(--border)] space-y-1">
        {bottomItems.map(({ icon: Icon, label, href }) => (
          <Link key={href} href={href} className="sidebar-item" onClick={() => setMobileSidebarOpen(false)}>
            <Icon size={18} className="flex-shrink-0" />
            {(sidebarOpen || mobile) && <span className="text-sm font-medium">{label}</span>}
          </Link>
        ))}
        <button onClick={handleLogout} className="sidebar-item w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600">
          <LogOut size={18} className="flex-shrink-0" />
          {(sidebarOpen || mobile) && <span className="text-sm font-medium">تسجيل الخروج</span>}
        </button>

        {/* User */}
        {(sidebarOpen || mobile) && (
          <Link href="/main/profile" className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--bg-secondary)] transition-colors mt-2" onClick={() => setMobileSidebarOpen(false)}>
            <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{user.username[0].toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[var(--text)] truncate">{user.username}</div>
              <div className="text-xs text-[var(--text-tertiary)] truncate">{user.email}</div>
            </div>
          </Link>
        )}
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-tertiary)]">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
          <div className="relative z-10 h-full animate-slide-in-right">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 flex items-center gap-4 px-4 sm:px-6 bg-[var(--bg)] border-b border-[var(--border)] flex-shrink-0">
          <button onClick={() => setMobileSidebarOpen(true)} className="md:hidden btn-ghost p-2 rounded-xl">
            <Menu size={20} />
          </button>

          {/* Search */}
          <div className="flex-1 max-w-md hidden sm:block">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-colors">
              <Search size={15} className="text-[var(--text-tertiary)] flex-shrink-0" />
              <input className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder-[var(--text-tertiary)] outline-none" placeholder="بحث..." />
              <kbd className="text-xs text-[var(--text-tertiary)] bg-[var(--bg)] border border-[var(--border)] px-1.5 py-0.5 rounded-md">⌘K</kbd>
            </div>
          </div>

          <div className="flex items-center gap-2 mr-auto">
            {user.role === 'ADMIN' && (
              <Link href="/admin" className="badge-red hidden sm:flex items-center gap-1">
                <ShieldCheck size={12} />
                <span>Admin</span>
              </Link>
            )}
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="btn-ghost p-2 rounded-xl">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="btn-ghost p-2 rounded-xl relative">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
