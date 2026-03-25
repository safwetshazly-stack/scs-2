'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ArrowLeft, Sparkles, Users, BookOpen, Bot } from 'lucide-react'
import { motion } from 'framer-motion'

const floatingBadges = [
  { icon: Users, label: 'مجتمعات نشطة', value: '1,200+', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400', delay: 0 },
  { icon: BookOpen, label: 'كورسات', value: '800+', color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400', delay: 0.1 },
  { icon: Bot, label: 'SCS AI', value: 'مدمج', color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400', delay: 0.2 },
  { icon: Sparkles, label: 'طلاب', value: '50K+', color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400', delay: 0.3 },
]

export function HeroSection() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) router.push(`/main/courses?q=${encodeURIComponent(query)}`)
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-brand-500/5 blur-3xl" />
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-purple-500/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-emerald-500/5 blur-3xl" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04] hero-grid-pattern" />
      </div>

      <div className="page-container py-20 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 text-brand-600 dark:text-brand-400 text-sm font-medium mb-8"
        >
          <Sparkles size={14} />
          <span>منصة التعلم الاجتماعية الأولى بالذكاء الاصطناعي</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="font-display font-bold text-4xl sm:text-5xl lg:text-7xl text-[var(--text)] leading-tight mb-6 text-balance"
        >
          تعلم، تواصل،
          <br />
          <span className="gradient-text">وانمو مع SCS</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-[var(--text-secondary)] text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          منصة تعليمية اجتماعية تجمع الكورسات، المجتمعات، والذكاء الاصطناعي في مكان واحد.
          ابدأ رحلتك التعليمية مع أفضل المعلمين وأكبر مجتمع طلابي.
        </motion.p>

        {/* Search Bar */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          onSubmit={handleSearch}
          className="relative max-w-xl mx-auto mb-8"
        >
          <div className="flex items-center gap-3 p-2 rounded-2xl bg-[var(--bg)] border border-[var(--border-strong)] shadow-card hover:shadow-card-hover transition-shadow">
            <Search size={18} className="text-[var(--text-tertiary)] mr-1 flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن كورس، مجتمع، أو موضوع..."
              className="flex-1 bg-transparent text-[var(--text)] placeholder-[var(--text-tertiary)] text-sm outline-none"
            />
            <button type="submit" className="btn-primary text-sm px-5 py-2 flex-shrink-0">
              بحث
            </button>
          </div>
        </motion.form>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex items-center justify-center gap-4 mb-16 flex-wrap"
        >
          <Link href="/auth/register" className="btn-primary text-base px-8 py-3 rounded-2xl gap-2">
            ابدأ مجاناً
            <ArrowLeft size={18} />
          </Link>
          <Link href="/main/communities" className="btn-secondary text-base px-8 py-3 rounded-2xl">
            استكشف المجتمعات
          </Link>
        </motion.div>

        {/* Floating Stats Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex items-center justify-center gap-3 flex-wrap"
        >
          {floatingBadges.map(({ icon: Icon, label, value, color, delay }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + delay }}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border border-[var(--border)] bg-[var(--bg)] shadow-card`}
            >
              <div className={`w-8 h-8 rounded-xl ${color} flex items-center justify-center`}>
                <Icon size={14} />
              </div>
              <div className="text-right">
                <div className="font-display font-bold text-sm text-[var(--text)]">{value}</div>
                <div className="text-[var(--text-tertiary)] text-xs">{label}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
