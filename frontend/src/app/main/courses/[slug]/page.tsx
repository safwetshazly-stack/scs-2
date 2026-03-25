'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { courseAPI, paymentAPI } from '@/services/api'
import { useAuthStore } from '@/store/auth.store'
import { Star, Users, Clock, BookOpen, Play, Lock, ChevronDown, ChevronUp, Award, CheckCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { cn, formatNumber } from '@/lib/utils'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

export default function CourseDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [openModules, setOpenModules] = useState<string[]>([])
  const { user } = useAuthStore()
  const router = useRouter()
  const qc = useQueryClient()

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', slug],
    queryFn: () => courseAPI.getBySlug(slug).then(r => r.data),
  })

  const enrollMutation = useMutation({
    mutationFn: () => courseAPI.enroll(course!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['course', slug] }); toast.success('تم التسجيل بنجاح!') },
  })

  const checkoutMutation = useMutation({
    mutationFn: () => paymentAPI.createCheckout({ itemType: 'course', itemId: course!.id }).then(r => r.data),
    onSuccess: (data) => { if (data.url) window.location.href = data.url },
  })

  const toggleModule = (id: string) => setOpenModules(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id])

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!course) return <div className="p-8 text-center">الكورس غير موجود</div>

  const totalLessons = course.modules?.reduce((sum: number, m: any) => sum + (m.lessons?.length || 0), 0)

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <Link href="/main/courses" className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-brand-500 mb-6 transition-colors">
        <ArrowLeft size={16} /> العودة للكورسات
      </Link>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero */}
          <div className="card overflow-hidden">
            <div className="h-56 bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-900/20 dark:to-brand-900/40 flex items-center justify-center">
              {course.thumbnail ? <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" /> : <BookOpen size={64} className="text-brand-300" />}
            </div>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="badge-blue">{course.language}</span>
                <span className="badge bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                  {course.level === 'BEGINNER' ? 'مبتدئ' : course.level === 'INTERMEDIATE' ? 'متوسط' : 'متقدم'}
                </span>
              </div>
              <h1 className="font-display font-bold text-2xl text-[var(--text)] mb-3">{course.title}</h1>
              <p className="text-[var(--text-secondary)] leading-relaxed mb-4">{course.description}</p>
              <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)] flex-wrap">
                <span className="flex items-center gap-1.5"><Star size={14} className="fill-amber-400 text-amber-400" />{course.rating?.toFixed(1)} ({formatNumber(course.reviewsCount)})</span>
                <span className="flex items-center gap-1.5"><Users size={14} />{formatNumber(course._count?.enrollments || 0)} طالب</span>
                <span className="flex items-center gap-1.5"><BookOpen size={14} />{totalLessons} درس</span>
              </div>
              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[var(--border)]">
                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold">
                  {course.instructor?.username?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-sm text-[var(--text)]">{course.instructor?.username}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">{course.instructor?._count?.coursesCreated} كورس • {formatNumber(course.instructor?._count?.followers || 0)} متابع</p>
                </div>
              </div>
            </div>
          </div>

          {/* Curriculum */}
          <div className="card p-6">
            <h2 className="font-display font-bold text-xl text-[var(--text)] mb-5">محتوى الكورس</h2>
            <div className="space-y-3">
              {course.modules?.map((mod: any) => (
                <div key={mod.id} className="border border-[var(--border)] rounded-xl overflow-hidden">
                  <button onClick={() => toggleModule(mod.id)}
                    className="flex items-center justify-between w-full p-4 hover:bg-[var(--bg-secondary)] transition-colors">
                    <div className="flex items-center gap-3">
                      {openModules.includes(mod.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      <span className="font-medium text-sm text-[var(--text)]">{mod.title}</span>
                    </div>
                    <span className="text-xs text-[var(--text-tertiary)]">{mod.lessons?.length} درس</span>
                  </button>
                  {openModules.includes(mod.id) && (
                    <div className="border-t border-[var(--border)]">
                      {mod.lessons?.map((lesson: any) => (
                        <div key={lesson.id} className={cn('flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] last:border-0', course.isEnrolled || lesson.isFree ? 'hover:bg-[var(--bg-secondary)] cursor-pointer' : '')}>
                          {course.isEnrolled || lesson.isFree ? <Play size={14} className="text-brand-500 flex-shrink-0" /> : <Lock size={14} className="text-[var(--text-tertiary)] flex-shrink-0" />}
                          <span className="text-sm text-[var(--text)] flex-1">{lesson.title}</span>
                          {lesson.isFree && <span className="text-xs text-emerald-500 font-medium">مجاني</span>}
                          <span className="text-xs text-[var(--text-tertiary)]">{Math.round(lesson.duration / 60)}د</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Reviews */}
          {course.reviews?.length > 0 && (
            <div className="card p-6">
              <h2 className="font-display font-bold text-xl text-[var(--text)] mb-5">آراء الطلاب</h2>
              <div className="space-y-4">
                {course.reviews.map((review: any) => (
                  <div key={review.id} className="flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-sm font-bold flex-shrink-0">
                      {review.user?.username?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-[var(--text)]">{review.user?.username}</span>
                        <div className="flex gap-0.5">
                          {Array(5).fill(0).map((_, i) => <Star key={i} size={12} className={cn('fill-amber-400 text-amber-400', i >= review.rating && 'fill-[var(--bg-tertiary)] text-[var(--bg-tertiary)]')} />)}
                        </div>
                      </div>
                      {review.content && <p className="text-sm text-[var(--text-secondary)]">{review.content}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card p-6 sticky top-20">
            <div className="text-center mb-6">
              <div className="font-display font-bold text-4xl text-[var(--text)] mb-1">
                {course.price === 0 ? <span className="text-emerald-500">مجاني</span> : `$${course.price}`}
              </div>
            </div>

            {course.isEnrolled ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600">
                  <CheckCircle size={18} />
                  <span className="text-sm font-medium">مسجل في الكورس</span>
                </div>
                <div className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[var(--text-secondary)]">تقدمك</span>
                    <span className="text-brand-500 font-medium">{course.progress || 0}%</span>
                  </div>
                  <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                    {/* Dynamic width for course progress bar - using CSS variable */}
                    {/* eslint-disable-next-line @next/next/no-css-tagged-template-literal */}
                    <div className="h-full bg-brand-500 rounded-full" style={{ '--course-progress': `${course.progress || 0}%` } as React.CSSProperties} />
                  </div>
                </div>
                <button className="btn-primary w-full justify-center">
                  <Play size={16} /> متابعة التعلم
                </button>
              </div>
            ) : !user ? (
              <Link href="/auth/login" className="btn-primary w-full justify-center block text-center">
                سجل الدخول للتسجيل
              </Link>
            ) : course.price === 0 ? (
              <button onClick={() => enrollMutation.mutate()} disabled={enrollMutation.isPending} className="btn-primary w-full justify-center">
                {enrollMutation.isPending ? 'جاري...' : 'سجل مجاناً'}
              </button>
            ) : (
              <button onClick={() => checkoutMutation.mutate()} disabled={checkoutMutation.isPending} className="btn-primary w-full justify-center">
                {checkoutMutation.isPending ? 'جاري...' : `اشتري الآن - $${course.price}`}
              </button>
            )}

            <div className="mt-6 space-y-3 text-sm text-[var(--text-secondary)]">
              {[
                { icon: BookOpen, text: `${totalLessons} درس` },
                { icon: Clock, text: `${Math.round((course.totalDuration || 0) / 3600)} ساعة محتوى` },
                { icon: Award, text: 'شهادة إتمام' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2">
                  <Icon size={15} className="text-[var(--text-tertiary)]" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
