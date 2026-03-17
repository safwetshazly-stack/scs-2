'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { useAuthStore } from '@/store/auth.store'
import { Bell, Search, Sun, Moon, Menu, X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const navLinks = [
  { label: 'المجتمعات', href: '/main/communities' },
  { label: 'الكورسات', href: '/main/courses' },
  { label: 'الكتب', href: '/main/books' },
  { label: 'SCS AI', href: '/main/ai', highlight: true },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const { user, logout } = useAuthStore()
  const pathname = usePathname()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <header
        className={cn(
          'fixed top-0 inset-x-0 z-50 transition-all duration-300',
          scrolled
            ? 'bg-[var(--bg)]/90 backdrop-blur-xl border-b border-[var(--border)] shadow-sm'
            : 'bg-transparent'
        )}
      >
        <div className="page-container">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center shadow-glow group-hover:shadow-glow-lg transition-all duration-300">
                <span className="text-white font-display font-bold text-sm">S</span>
              </div>
              <span className="font-display font-bold text-lg text-[var(--text)]">SCS</span>
              <span className="hidden sm:block text-[var(--text-tertiary)] text-sm">Platform</span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150',
                    link.highlight
                      ? 'bg-brand-500/10 text-brand-500 hover:bg-brand-500/20'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--bg-secondary)]',
                    pathname === link.href && 'text-[var(--text)] bg-[var(--bg-secondary)]'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="btn-ghost p-2 rounded-xl"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {user ? (
                <>
                  {/* Notifications */}
                  <Link href="/main/dashboard" className="btn-ghost p-2 rounded-xl relative">
                    <Bell size={18} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                  </Link>

                  {/* User Menu */}
                  <Link href="/main/dashboard" className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-[var(--bg-secondary)] transition-colors">
                    <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center">
                      <span className="text-white text-xs font-medium">{user.username[0].toUpperCase()}</span>
                    </div>
                    <span className="hidden sm:block text-sm font-medium text-[var(--text)]">{user.username}</span>
                    <ChevronDown size={14} className="text-[var(--text-tertiary)]" />
                  </Link>
                </>
              ) : (
                <div className="hidden sm:flex items-center gap-2">
                  <Link href="/auth/login" className="btn-ghost text-sm px-4 py-2">
                    تسجيل الدخول
                  </Link>
                  <Link href="/auth/register" className="btn-primary text-sm px-4 py-2">
                    انضم مجاناً
                  </Link>
                </div>
              )}

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden btn-ghost p-2 rounded-xl"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute top-16 inset-x-0 bg-[var(--bg)] border-b border-[var(--border)] p-4 animate-fade-up">
            <nav className="flex flex-col gap-1 mb-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text)] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            {!user && (
              <div className="flex flex-col gap-2">
                <Link href="/auth/login" className="btn-secondary text-center justify-center" onClick={() => setMobileOpen(false)}>
                  تسجيل الدخول
                </Link>
                <Link href="/auth/register" className="btn-primary text-center justify-center" onClick={() => setMobileOpen(false)}>
                  انضم مجاناً
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
