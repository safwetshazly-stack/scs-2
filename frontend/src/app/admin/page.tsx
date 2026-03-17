'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminAPI } from '@/services/api'
import { useAuthStore } from '@/store/auth.store'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Users, BookOpen, DollarSign, Bot, Shield, TrendingUp, Ban, CheckCircle, XCircle, Activity } from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

const TABS = [
  { id: 'overview', label: 'نظرة عامة' },
  { id: 'users', label: 'المستخدمون' },
  { id: 'courses', label: 'الكورسات' },
  { id: 'security', label: 'السجلات الأمنية' },
]

export default function AdminPage() {
  const [tab, setTab] = useState('overview')
  const [banReason, setBanReason] = useState('')
  const [banUserId, setBanUserId] = useState<string | null>(null)
  const { user } = useAuthStore()
  const router = useRouter()
  const qc = useQueryClient()

  useEffect(() => { if (user && user.role !== 'ADMIN') router.push('/main/dashboard') }, [user])

  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: () => adminAPI.getStats().then(r => r.data) })
  const { data: usersData } = useQuery({ queryKey: ['admin-users'], queryFn: () => adminAPI.getUsers({ limit: 20 }).then(r => r.data), enabled: tab === 'users' })
  const { data: coursesData } = useQuery({ queryKey: ['admin-courses'], queryFn: () => adminAPI.getCourses({ status: 'PENDING_REVIEW' }).then(r => r.data), enabled: tab === 'courses' })
  const { data: securityLogs = [] } = useQuery({ queryKey: ['admin-security'], queryFn: () => adminAPI.getSecurityLogs({ success: 'false', limit: 50 }).then(r => r.data), enabled: tab === 'security' })

  const banMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) => adminAPI.banUser(userId, reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setBanUserId(null); setBanReason(''); toast.success('تم حظر المستخدم') },
  })
  const unbanMutation = useMutation({
    mutationFn: (id: string) => adminAPI.unbanUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('تم رفع الحظر') },
  })
  const approveMutation = useMutation({
    mutationFn: (id: string) => adminAPI.approveCourse(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-courses'] }); toast.success('تم نشر الكورس') },
  })
  const rejectMutation = useMutation({
    mutationFn: (id: string) => adminAPI.rejectCourse(id, 'Does not meet quality standards'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-courses'] }); toast.success('تم رفض الكورس') },
  })

  if (!user || user.role !== 'ADMIN') return null

  const statCards = [
    { label: 'إجمالي المستخدمين', value: formatNumber(stats?.users?.total || 0), sub: `+${stats?.users?.today || 0} اليوم`, icon: Users, color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-500' },
    { label: 'مستخدمون متصلون', value: formatNumber(stats?.users?.online || 0), sub: 'الآن', icon: Activity, color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500' },
    { label: 'إجمالي الإيرادات', value: `$${formatNumber(stats?.revenue?.total || 0)}`, sub: 'إجمالي', icon: DollarSign, color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-500' },
    { label: 'طلبات AI اليوم', value: formatNumber(stats?.ai?.requestsToday || 0), sub: 'طلب اليوم', icon: Bot, color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-500' },
  ]

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
          <Shield size={20} className="text-red-500" />
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl text-[var(--text)]">لوحة الإدارة</h1>
          <p className="text-xs text-[var(--text-tertiary)]">مرحباً {user.username} — صلاحية Admin</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--bg-secondary)] p-1 rounded-xl mb-6 w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t.id ? 'bg-[var(--bg)] text-[var(--text)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
            )}>{t.label}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {statCards.map(({ label, value, sub, icon: Icon, color }, i) => (
              <motion.div key={label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="stat-card">
                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}><Icon size={18} /></div>
                <div className="font-display font-bold text-2xl text-[var(--text)]">{value}</div>
                <div className="text-[var(--text-secondary)] text-xs">{label}</div>
                <div className="text-[var(--text-tertiary)] text-xs mt-0.5">{sub}</div>
              </motion.div>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="card p-5">
              <h3 className="font-semibold text-[var(--text)] mb-3">الكورسات</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-[var(--text-secondary)]">إجمالي</span><span className="font-medium text-[var(--text)]">{stats?.courses?.total || 0}</span></div>
                <div className="flex justify-between text-sm"><span className="text-[var(--text-secondary)]">منشورة</span><span className="font-medium text-emerald-500">{stats?.courses?.published || 0}</span></div>
              </div>
            </div>
            <div className="card p-5">
              <h3 className="font-semibold text-[var(--text)] mb-3">الرسائل</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-[var(--text-secondary)]">إجمالي الرسائل</span><span className="font-medium text-[var(--text)]">{formatNumber(stats?.messages?.total || 0)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-[var(--text-secondary)]">المجتمعات</span><span className="font-medium text-[var(--text)]">{stats?.communities?.total || 0}</span></div>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'users' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-secondary)]">
                <tr>
                  {['المستخدم', 'البريد', 'الدور', 'الحالة', 'تاريخ التسجيل', 'إجراء'].map(h => (
                    <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {usersData?.users?.map((u: any) => (
                  <tr key={u.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="px-4 py-3 font-medium text-[var(--text)]">{u.username}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{u.email}</td>
                    <td className="px-4 py-3"><span className={cn('badge text-xs', u.role === 'ADMIN' ? 'badge-red' : u.role === 'INSTRUCTOR' ? 'badge-blue' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]')}>{u.role}</span></td>
                    <td className="px-4 py-3"><span className={cn('badge text-xs', u.isBanned ? 'badge-red' : 'badge-green')}>{u.isBanned ? 'محظور' : 'نشط'}</span></td>
                    <td className="px-4 py-3 text-[var(--text-tertiary)] text-xs">{new Date(u.createdAt).toLocaleDateString('ar')}</td>
                    <td className="px-4 py-3">
                      {u.isBanned ? (
                        <button onClick={() => unbanMutation.mutate(u.id)} className="text-xs text-emerald-500 hover:text-emerald-600 font-medium">رفع الحظر</button>
                      ) : (
                        <button onClick={() => setBanUserId(u.id)} className="text-xs text-red-500 hover:text-red-600 font-medium">حظر</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'courses' && (
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-secondary)] mb-4">كورسات تنتظر المراجعة</p>
          {coursesData?.courses?.length === 0 && <p className="text-center py-8 text-[var(--text-tertiary)]">لا توجد كورسات تنتظر المراجعة</p>}
          {coursesData?.courses?.map((c: any) => (
            <div key={c.id} className="card p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[var(--text)]">{c.title}</p>
                <p className="text-xs text-[var(--text-tertiary)]">{c.instructor?.username} • {c._count?.enrollments} طالب</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => approveMutation.mutate(c.id)} className="flex items-center gap-1 text-xs btn-primary px-3 py-1.5">
                  <CheckCircle size={12} /> نشر
                </button>
                <button onClick={() => rejectMutation.mutate(c.id)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-red-300 text-red-500 hover:bg-red-50 transition-colors">
                  <XCircle size={12} /> رفض
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'security' && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-[var(--border)] flex items-center gap-2">
            <Shield size={16} className="text-red-500" />
            <span className="text-sm font-medium text-[var(--text)]">محاولات دخول فاشلة</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-secondary)]">
                <tr>
                  {['البريد', 'IP', 'الوقت'].map(h => <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-[var(--text-secondary)]">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {securityLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-[var(--bg-secondary)]">
                    <td className="px-4 py-2.5 text-[var(--text)]">{log.email}</td>
                    <td className="px-4 py-2.5 text-[var(--text-secondary)] font-mono text-xs">{log.ipAddress}</td>
                    <td className="px-4 py-2.5 text-[var(--text-tertiary)] text-xs">{new Date(log.createdAt).toLocaleString('ar')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ban Modal */}
      {banUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="card p-6 max-w-sm w-full">
            <h3 className="font-bold text-lg text-[var(--text)] mb-4">حظر المستخدم</h3>
            <textarea value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="سبب الحظر..." className="input-field w-full resize-none mb-4" rows={3} />
            <div className="flex gap-3">
              <button onClick={() => setBanUserId(null)} className="btn-secondary flex-1 justify-center">إلغاء</button>
              <button onClick={() => banMutation.mutate({ userId: banUserId, reason: banReason })} disabled={!banReason.trim() || banMutation.isPending} className="flex-1 justify-center px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50">حظر</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
