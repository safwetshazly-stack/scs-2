'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { courseAPI } from '@/services/api'
import { useAuthStore } from '@/store/auth.store'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BookOpen, Users, DollarSign, Star, Plus, Eye, Edit2, Trash2, Send } from 'lucide-react'
import Link from 'next/link'
import { formatNumber, cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

export default function InstructorPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', price: '0', level: 'BEGINNER', language: 'AR' })

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return }
    if (!['INSTRUCTOR', 'ADMIN'].includes(user.role)) router.push('/main/dashboard')
  }, [user])

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['instructor-courses'],
    queryFn: () => courseAPI.getInstructorCourses?.().then(r => r.data) || Promise.resolve([]),
    enabled: !!user,
  })

  const createMutation = useMutation({
    mutationFn: () => courseAPI.create(form),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['instructor-courses'] })
      toast.success('تم إنشاء الكورس!')
      setShowCreate(false)
      router.push(`/main/courses/${res.data.slug}`)
    },
  })

  const publishMutation = useMutation({
    mutationFn: (id: string) => courseAPI.publish?.(id) || Promise.resolve(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['instructor-courses'] }); toast.success('تم إرسال الكورس للمراجعة') },
  })

  const totalStudents = courses.reduce((sum: number, c: any) => sum + (c._count?.enrollments || 0), 0)
  const avgRating = courses.length > 0 ? courses.reduce((sum: number, c: any) => sum + (c.rating || 0), 0) / courses.length : 0

  if (!user || !['INSTRUCTOR', 'ADMIN'].includes(user.role)) return null

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-[var(--text)]">لوحة المعلم</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">مرحباً {user.username} — إدارة كورساتك</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary gap-2">
          <Plus size={16} /> إنشاء كورس
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { icon: BookOpen, label: 'الكورسات', value: courses.length, color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-500' },
          { icon: Users, label: 'إجمالي الطلاب', value: formatNumber(totalStudents), color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500' },
          { icon: Star, label: 'متوسط التقييم', value: avgRating.toFixed(1), color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-500' },
          { icon: DollarSign, label: 'كورسات منشورة', value: courses.filter((c: any) => c.status === 'PUBLISHED').length, color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-500' },
        ].map(({ icon: Icon, label, value, color }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="stat-card">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', color)}><Icon size={18} /></div>
            <div className="font-display font-bold text-2xl text-[var(--text)]">{value}</div>
            <div className="text-[var(--text-secondary)] text-xs mt-0.5">{label}</div>
          </motion.div>
        ))}
      </div>

      {/* Courses Table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-[var(--border)]">
          <h2 className="font-display font-semibold text-lg text-[var(--text)]">كورساتي</h2>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-[var(--text-secondary)]">جاري التحميل...</div>
        ) : courses.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen size={40} className="mx-auto text-[var(--text-tertiary)] opacity-30 mb-4" />
            <p className="text-[var(--text-secondary)] mb-4">لم تنشئ أي كورس بعد</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary">إنشاء أول كورس</button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {courses.map((course: any) => (
              <div key={course.id} className="flex items-center gap-4 p-4 hover:bg-[var(--bg-secondary)] transition-colors">
                <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center flex-shrink-0">
                  <BookOpen size={20} className="text-brand-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[var(--text)] truncate">{course.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-tertiary)]">
                    <span>{course._count?.enrollments || 0} طالب</span>
                    <span>⭐ {course.rating?.toFixed(1) || '—'}</span>
                    <span className={cn('badge text-xs', {
                      'badge-blue': course.status === 'PUBLISHED',
                      'badge-amber': course.status === 'DRAFT',
                      'bg-orange-50 text-orange-600': course.status === 'PENDING_REVIEW',
                    })}>
                      {course.status === 'PUBLISHED' ? 'منشور' : course.status === 'DRAFT' ? 'مسودة' : 'قيد المراجعة'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {course.status === 'DRAFT' && (
                    <button onClick={() => publishMutation.mutate(course.id)} className="btn-secondary text-xs px-3 py-1.5 gap-1">
                      <Send size={12} /> للمراجعة
                    </button>
                  )}
                  <Link href={`/main/courses/${course.slug}`} className="btn-ghost p-2 rounded-xl">
                    <Eye size={16} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card w-full max-w-lg p-6">
            <h2 className="font-display font-bold text-xl text-[var(--text)] mb-6">إنشاء كورس جديد</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1.5">عنوان الكورس *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="مثال: تطوير تطبيقات React" className="input-field w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1.5">وصف الكورس *</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="وصف تفصيلي للكورس..." className="input-field w-full resize-none" rows={3} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1.5">السعر ($)</label>
                  <input type="number" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="input-field w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1.5">المستوى</label>
                  <select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} className="input-field w-full">
                    <option value="BEGINNER">مبتدئ</option>
                    <option value="INTERMEDIATE">متوسط</option>
                    <option value="ADVANCED">متقدم</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1.5">اللغة</label>
                  <select value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))} className="input-field w-full">
                    <option value="AR">عربي</option>
                    <option value="EN">English</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1 justify-center">إلغاء</button>
              <button onClick={() => createMutation.mutate()} disabled={!form.title.trim() || !form.description.trim() || createMutation.isPending} className="btn-primary flex-1 justify-center">
                {createMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
