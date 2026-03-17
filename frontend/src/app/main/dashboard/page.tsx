'use client'
import { useAuthStore } from '@/store/auth.store'
import { useQuery } from '@tanstack/react-query'
import { courseAPI, communityAPI, aiAPI } from '@/services/api'
import { BookOpen, Users, Bot, TrendingUp, Clock, Star, ArrowLeft, Zap } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function DashboardPage() {
  const { user } = useAuthStore()

  const { data: enrollments } = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => courseAPI.getAll({ enrolled: true, limit: 4 }),
  })

  const { data: aiUsage } = useQuery({
    queryKey: ['ai-usage'],
    queryFn: () => aiAPI.getUsage(),
  })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'صباح الخير' : hour < 17 ? 'مساء الخير' : 'مساء النور'

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-[var(--text)]">
          {greeting}، {user?.username} 👋
        </h1>
        <p className="text-[var(--text-secondary)] mt-1">استمر في رحلتك التعليمية اليوم</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: BookOpen, label: 'كورسات مسجلة', value: '4', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-500', change: '+1 هذا الأسبوع' },
          { icon: Users, label: 'مجتمعاتي', value: '6', color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500', change: '2 نشطة اليوم' },
          { icon: Bot, label: 'جلسات AI', value: '23', color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-500', change: '5 هذا الأسبوع' },
          { icon: TrendingUp, label: 'نقاط التعلم', value: '1,240', color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-500', change: '+80 اليوم' },
        ].map(({ icon: Icon, label, value, color, change }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="stat-card"
          >
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
              <Icon size={18} />
            </div>
            <div className="font-display font-bold text-2xl text-[var(--text)]">{value}</div>
            <div className="text-[var(--text-secondary)] text-xs mt-0.5">{label}</div>
            <div className="text-[var(--text-tertiary)] text-xs mt-1">{change}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Continue Learning */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-lg text-[var(--text)]">تابع التعلم</h2>
            <Link href="/main/courses" className="text-sm text-brand-500 hover:text-brand-600 flex items-center gap-1">
              عرض الكل <ArrowLeft size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {[
              { title: 'تطوير React من الصفر', progress: 65, lessons: '13/20', next: 'درس: Hooks المتقدمة' },
              { title: 'Python للذكاء الاصطناعي', progress: 32, lessons: '8/25', next: 'درس: Neural Networks' },
              { title: 'تصميم UI/UX', progress: 88, lessons: '22/25', next: 'درس: Design Systems' },
            ].map(({ title, progress, lessons, next }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                className="card card-hover p-4 cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center flex-shrink-0">
                    <BookOpen size={18} className="text-brand-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-sm text-[var(--text)] truncate">{title}</h3>
                      <span className="text-xs text-[var(--text-tertiary)] flex-shrink-0 mr-2">{lessons}</span>
                    </div>
                    <p className="text-xs text-[var(--text-tertiary)] mb-2">{next}</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-xs font-medium text-brand-500 flex-shrink-0">{progress}%</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          {/* AI Usage Card */}
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                <Bot size={18} className="text-purple-500" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-[var(--text)]">SCS AI</h3>
                <p className="text-xs text-[var(--text-tertiary)]">استخدام هذا الشهر</p>
              </div>
            </div>
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-[var(--text-secondary)]">23,500 / 50,000 رمز</span>
                <span className="text-purple-500 font-medium">47%</span>
              </div>
              <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: '47%' }} />
              </div>
            </div>
            <Link href="/main/ai" className="btn-primary w-full justify-center text-sm py-2.5">
              <Zap size={14} />
              فتح SCS AI
            </Link>
          </div>

          {/* Quick Actions */}
          <div className="card p-5">
            <h3 className="font-semibold text-sm text-[var(--text)] mb-3">إجراءات سريعة</h3>
            <div className="space-y-2">
              {[
                { label: 'استكشف كورسات جديدة', href: '/main/courses', icon: BookOpen },
                { label: 'انضم لمجتمع', href: '/main/communities', icon: Users },
                { label: 'راسل مستخدماً', href: '/main/chat', icon: Clock },
                { label: 'اكتشف كتب', href: '/main/books', icon: Star },
              ].map(({ label, href, icon: Icon }) => (
                <Link key={href} href={href} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--bg-secondary)] transition-colors group">
                  <Icon size={15} className="text-[var(--text-tertiary)] group-hover:text-brand-500 transition-colors" />
                  <span className="text-sm text-[var(--text-secondary)] group-hover:text-[var(--text)] transition-colors">{label}</span>
                  <ArrowLeft size={13} className="text-[var(--text-tertiary)] mr-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
