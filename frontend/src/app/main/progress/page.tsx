'use client'
import { useQuery } from '@tanstack/react-query'
import { courseAPI } from '@/services/api'
import { BookOpen, Award, TrendingUp, Clock } from 'lucide-react'
import Link from 'next/link'
import { ProgressBar } from '@/components/ui'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export default function ProgressPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['enrolled-courses'],
    queryFn: () => courseAPI.getAll({ enrolled: true, limit: 50 }).then(r => r.data),
  })

  const courses = data?.courses || []
  const completed = courses.filter((c: any) => c.progress === 100)
  const inProgress = courses.filter((c: any) => c.progress > 0 && c.progress < 100)
  const notStarted = courses.filter((c: any) => !c.progress || c.progress === 0)

  const totalMinutes = courses.reduce((sum: number, c: any) => sum + (c.totalDuration || 0) / 60, 0)

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <h1 className="font-display font-bold text-2xl text-[var(--text)] mb-6">تقدمي التعليمي</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { icon: BookOpen, label: 'كورسات مسجلة', value: courses.length, color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-500' },
          { icon: TrendingUp, label: 'قيد التعلم', value: inProgress.length, color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-500' },
          { icon: Award, label: 'مكتملة', value: completed.length, color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500' },
          { icon: Clock, label: 'ساعات محتوى', value: `${Math.round(totalMinutes / 60)}س`, color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-500' },
        ].map(({ icon: Icon, label, value, color }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="stat-card">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', color)}>
              <Icon size={18} />
            </div>
            <div className="font-display font-bold text-2xl text-[var(--text)]">{value}</div>
            <div className="text-[var(--text-secondary)] text-xs mt-0.5">{label}</div>
          </motion.div>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-4">
          {Array(3).fill(0).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
      )}

      {/* In Progress */}
      {inProgress.length > 0 && (
        <section className="mb-8">
          <h2 className="font-display font-semibold text-lg text-[var(--text)] mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-amber-500" /> قيد التعلم
          </h2>
          <div className="space-y-3">
            {inProgress.map((course: any) => (
              <Link key={course.id} href={`/main/courses/${course.slug}`} className="card card-hover p-5 flex items-center gap-4 block">
                <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center flex-shrink-0">
                  <BookOpen size={20} className="text-brand-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[var(--text)] mb-2 truncate">{course.title}</p>
                  <ProgressBar value={course.progress} showLabel size="sm" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <section className="mb-8">
          <h2 className="font-display font-semibold text-lg text-[var(--text)] mb-4 flex items-center gap-2">
            <Award size={18} className="text-emerald-500" /> مكتملة
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {completed.map((course: any) => (
              <div key={course.id} className="card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
                  <Award size={18} className="text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-[var(--text)] truncate">{course.title}</p>
                  <p className="text-xs text-emerald-500 mt-0.5">مكتمل ✓</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Not started */}
      {notStarted.length > 0 && (
        <section>
          <h2 className="font-display font-semibold text-lg text-[var(--text)] mb-4 flex items-center gap-2">
            <BookOpen size={18} className="text-[var(--text-tertiary)]" /> لم تبدأ بعد
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {notStarted.map((course: any) => (
              <Link key={course.id} href={`/main/courses/${course.slug}`} className="card card-hover p-4 flex items-center gap-3 block">
                <div className="w-10 h-10 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center flex-shrink-0">
                  <BookOpen size={18} className="text-[var(--text-tertiary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-[var(--text)] truncate">{course.title}</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">ابدأ الآن</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {courses.length === 0 && !isLoading && (
        <div className="text-center py-16">
          <BookOpen size={48} className="mx-auto text-[var(--text-tertiary)] opacity-30 mb-4" />
          <p className="font-semibold text-[var(--text)] mb-2">لم تسجل في أي كورس بعد</p>
          <p className="text-sm text-[var(--text-secondary)] mb-6">استكشف كورساتنا وابدأ رحلتك التعليمية</p>
          <Link href="/main/courses" className="btn-primary">استكشف الكورسات</Link>
        </div>
      )}
    </div>
  )
}
