'use client'
import { forwardRef, ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, useState } from 'react'
import { cn } from '@/lib/utils'
import { Loader2, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── BUTTON ──────────────────────────────────────────────
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'
    const variants = {
      primary: 'bg-brand-500 text-white hover:bg-brand-600 hover:shadow-glow',
      secondary: 'bg-[var(--bg-secondary)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-tertiary)]',
      ghost: 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text)]',
      danger: 'bg-red-500 text-white hover:bg-red-600',
    }
    const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-5 py-2.5 text-sm', lg: 'px-7 py-3 text-base' }
    return (
      <button ref={ref} disabled={disabled || loading} className={cn(base, variants[variant], sizes[size], className)} {...props}>
        {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

// ─── INPUT ───────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightIcon, className, ...props }, ref) => (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-[var(--text)] mb-1.5">{label}</label>}
      <div className="relative">
        {leftIcon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">{leftIcon}</div>}
        <input ref={ref} className={cn('input-field w-full', leftIcon && 'pl-10', rightIcon && 'pr-10', error && 'border-red-400', className)} {...props} />
        {rightIcon && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">{rightIcon}</div>}
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
)
Input.displayName = 'Input'

// ─── TEXTAREA ────────────────────────────────────────────
export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }>(
  ({ label, error, className, ...props }, ref) => (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-[var(--text)] mb-1.5">{label}</label>}
      <textarea ref={ref} className={cn('input-field w-full resize-none', error && 'border-red-400', className)} {...props} />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
)
Textarea.displayName = 'Textarea'

// ─── SELECT ──────────────────────────────────────────────
export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string; options: { value: string; label: string }[] }>(
  ({ label, error, options, className, ...props }, ref) => (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-[var(--text)] mb-1.5">{label}</label>}
      <select ref={ref} className={cn('input-field w-full', className)} {...props}>
        {options.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
      </select>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
)
Select.displayName = 'Select'

// ─── AVATAR ──────────────────────────────────────────────
export function Avatar({ src, name, size = 'md', online, className }: {
  src?: string; name?: string; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; online?: boolean; className?: string
}) {
  const sizes = { xs: 'w-6 h-6 text-[10px]', sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-xl' }
  const initials = name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
  return (
    <div className={cn('relative flex-shrink-0', className)}>
      <div className={cn('rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 font-bold overflow-hidden', sizes[size])}>
        {src ? <img src={src} alt={name} className="w-full h-full object-cover" /> : <span>{initials}</span>}
      </div>
      {online !== undefined && (
        <div className={cn('absolute bottom-0 right-0 rounded-full border-2 border-[var(--bg)]', online ? 'bg-emerald-500' : 'bg-gray-400', size === 'xs' ? 'w-1.5 h-1.5' : 'w-2.5 h-2.5')} />
      )}
    </div>
  )
}

// ─── BADGE ───────────────────────────────────────────────
export function Badge({ children, variant = 'blue', size = 'md', className }: {
  children: ReactNode; variant?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'gray'; size?: 'sm' | 'md'; className?: string
}) {
  const variants = {
    blue: 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400',
    green: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    red: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    gray: 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]',
  }
  return (
    <span className={cn('inline-flex items-center gap-1 font-medium rounded-lg', size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs', variants[variant], className)}>
      {children}
    </span>
  )
}

// ─── SKELETON ────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[var(--bg-secondary)] rounded-xl', className)} />
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array(lines).fill(0).map((_, i) => (
        <Skeleton key={i} className={cn('h-4', i === lines - 1 ? 'w-3/4' : 'w-full')} />
      ))}
    </div>
  )
}

// ─── SPINNER ─────────────────────────────────────────────
export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }
  return <Loader2 className={cn('animate-spin text-brand-500', sizes[size], className)} />
}

export function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-brand-500 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <span className="text-white font-bold text-lg">S</span>
        </div>
        <Spinner size="md" />
      </div>
    </div>
  )
}

// ─── MODAL ───────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md', className }: {
  open: boolean; onClose: () => void; title?: string; children: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string
}) {
  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' }
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
            className={cn('relative card w-full p-6 shadow-2xl', sizes[size], className)}>
            {title && (
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display font-bold text-xl text-[var(--text)]">{title}</h2>
                <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg" aria-label="إغلاق النافذة"><X size={18} /></button>
              </div>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// ─── EMPTY STATE ─────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: {
  icon?: ReactNode; title: string; description?: string; action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && <div className="w-16 h-16 rounded-2xl bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-tertiary)] mb-5 opacity-50">{icon}</div>}
      <h3 className="font-semibold text-[var(--text)] mb-2">{title}</h3>
      {description && <p className="text-sm text-[var(--text-secondary)] max-w-xs mb-5">{description}</p>}
      {action}
    </div>
  )
}

// ─── PROGRESS BAR ────────────────────────────────────────
export function ProgressBar({ value, max = 100, size = 'md', color = 'bg-brand-500', showLabel, className }: {
  value: number; max?: number; size?: 'sm' | 'md'; color?: string; showLabel?: boolean; className?: string
}) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100)
  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs mb-1">
          <span className="text-[var(--text-secondary)]">التقدم</span>
          <span className="text-brand-500 font-medium">{Math.round(pct)}%</span>
        </div>
      )}
      <div className={cn('w-full bg-[var(--bg-secondary)] rounded-full overflow-hidden', size === 'sm' ? 'h-1.5' : 'h-2.5')}>
        {/* Dynamic width using CSS variable - cannot be moved to CSS file */}
        {/* eslint-disable-next-line @next/next/no-css-tagged-template-literal */}
        <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ '--progress-width': `${pct}%` } as React.CSSProperties} />
      </div>
    </div>
  )
}

// ─── TOGGLE ──────────────────────────────────────────────
export function Toggle({ checked, onChange, label, description, disabled }: {
  checked: boolean; onChange: (v: boolean) => void; label?: string; description?: string; disabled?: boolean
}) {
  return (
    <label className={cn('flex items-center justify-between gap-4 cursor-pointer', disabled && 'opacity-50 cursor-not-allowed')}>
      {(label || description) && (
        <div>
          {label && <p className="text-sm font-medium text-[var(--text)]">{label}</p>}
          {description && <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{description}</p>}
        </div>
      )}
      <div
        onClick={() => !disabled && onChange(!checked)}
        className={cn('relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0', checked ? 'bg-brand-500' : 'bg-[var(--border-strong)]')}
      >
        <div className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200', checked ? 'translate-x-5' : 'translate-x-0.5')} />
      </div>
    </label>
  )
}

// ─── STAR RATING ─────────────────────────────────────────
export function StarRating({ value, onChange, size = 18, readonly }: {
  value: number; onChange?: (v: number) => void; size?: number; readonly?: boolean
}) {
  const [hoverVal, setHoverVal] = useState(0)
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button key={star} type="button"
          onClick={() => !readonly && onChange?.(star)}
          onMouseEnter={() => !readonly && setHoverVal(star)}
          onMouseLeave={() => !readonly && setHoverVal(0)}
          className={cn('transition-transform', !readonly && 'hover:scale-110', readonly && 'cursor-default')}
          aria-label={`تقييم ${star} من 5 نجوم`}>
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill={(hoverVal || value) >= star ? '#F59E0B' : 'none'}
              stroke={(hoverVal || value) >= star ? '#F59E0B' : '#D1D5DB'}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ))}
    </div>
  )
}

// ─── DIVIDER ─────────────────────────────────────────────
export function Divider({ label, className }: { label?: string; className?: string }) {
  if (!label) return <div className={cn('w-full h-px bg-[var(--border)]', className)} />
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex-1 h-px bg-[var(--border)]" />
      <span className="text-xs text-[var(--text-tertiary)]">{label}</span>
      <div className="flex-1 h-px bg-[var(--border)]" />
    </div>
  )
}

// ─── CARD ────────────────────────────────────────────────
export function Card({ children, className, hover = false, onClick }: {
  children: ReactNode; className?: string; hover?: boolean; onClick?: () => void
}) {
  return (
    <div onClick={onClick} className={cn('card', hover && 'card-hover cursor-pointer', className)}>
      {children}
    </div>
  )
}

// ─── TOOLTIP ─────────────────────────────────────────────
export function Tooltip({ content, children }: { content: string; children: ReactNode }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded-lg whitespace-nowrap pointer-events-none z-50">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
        </div>
      )}
    </div>
  )
}
