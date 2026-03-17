'use client'
import { useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { userAPI } from '@/services/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { User, Bell, Shield, CreditCard, Globe, Moon, Smartphone, Key, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const SECTIONS = [
  { id: 'profile', label: 'الملف الشخصي', icon: User },
  { id: 'notifications', label: 'الإشعارات', icon: Bell },
  { id: 'security', label: 'الأمان', icon: Shield },
  { id: 'billing', label: 'الاشتراك', icon: CreditCard },
]

export default function SettingsPage() {
  const [section, setSection] = useState('profile')
  const { user } = useAuthStore()
  const qc = useQueryClient()

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => userAPI.getSessions().then(r => r.data),
    enabled: section === 'security',
  })

  const revokeSession = useMutation({
    mutationFn: (id: string) => userAPI.revokeSession(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sessions'] }); toast.success('تم إلغاء الجلسة') },
  })

  const [profileForm, setProfileForm] = useState({ bio: '', country: '', university: '', major: '', website: '', skills: '' })
  const updateProfile = useMutation({
    mutationFn: () => userAPI.updateProfile({ ...profileForm, skills: profileForm.skills.split(',').map(s => s.trim()).filter(Boolean) }),
    onSuccess: () => toast.success('تم حفظ التغييرات'),
  })

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <h1 className="font-display font-bold text-2xl text-[var(--text)] mb-6">الإعدادات</h1>
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Sidebar */}
        <div className="sm:w-48 flex-shrink-0">
          <nav className="space-y-1">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setSection(id)}
                className={cn('flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  section === id ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text)]'
                )}>
                <Icon size={16} className="flex-shrink-0" /> {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {section === 'profile' && (
            <div className="card p-6 space-y-5">
              <h2 className="font-display font-semibold text-lg text-[var(--text)]">الملف الشخصي</h2>
              <div className="flex items-center gap-4 pb-4 border-b border-[var(--border)]">
                <div className="w-16 h-16 rounded-full bg-brand-500 flex items-center justify-center text-white text-2xl font-bold">
                  {user?.username?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-[var(--text)]">{user?.username}</p>
                  <p className="text-sm text-[var(--text-secondary)]">{user?.email}</p>
                  <button className="text-xs text-brand-500 hover:text-brand-600 mt-1">تغيير الصورة</button>
                </div>
              </div>
              {[
                { label: 'نبذة عني', key: 'bio', type: 'textarea', placeholder: 'اكتب نبذة مختصرة عنك...' },
                { label: 'البلد', key: 'country', type: 'text', placeholder: 'مثال: Egypt' },
                { label: 'الجامعة', key: 'university', type: 'text', placeholder: 'اسم جامعتك' },
                { label: 'التخصص', key: 'major', type: 'text', placeholder: 'تخصصك الدراسي' },
                { label: 'الموقع الإلكتروني', key: 'website', type: 'url', placeholder: 'https://yourwebsite.com' },
                { label: 'المهارات (مفصولة بفاصلة)', key: 'skills', type: 'text', placeholder: 'React, Python, AI...' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1.5">{label}</label>
                  {type === 'textarea' ? (
                    <textarea value={(profileForm as any)[key]} onChange={e => setProfileForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} className="input-field w-full resize-none" rows={3} />
                  ) : (
                    <input type={type} value={(profileForm as any)[key]} onChange={e => setProfileForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} className="input-field w-full" />
                  )}
                </div>
              ))}
              <button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending} className="btn-primary">
                {updateProfile.isPending ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
            </div>
          )}

          {section === 'security' && (
            <div className="space-y-4">
              <div className="card p-6">
                <h2 className="font-display font-semibold text-lg text-[var(--text)] mb-5">الجلسات النشطة</h2>
                <div className="space-y-3">
                  {sessions.length === 0 && <p className="text-sm text-[var(--text-secondary)]">لا توجد جلسات نشطة أخرى</p>}
                  {sessions.map((s: any) => (
                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)]">
                      <Smartphone size={18} className="text-[var(--text-tertiary)] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text)] truncate">{s.deviceInfo || 'Unknown Device'}</p>
                        <p className="text-xs text-[var(--text-tertiary)]">{s.ipAddress}</p>
                      </div>
                      <button onClick={() => revokeSession.mutate(s.id)} className="text-xs text-red-500 hover:text-red-600 font-medium transition-colors">إلغاء</button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card p-6">
                <h2 className="font-display font-semibold text-lg text-[var(--text)] mb-5">كلمة المرور</h2>
                <div className="space-y-3">
                  {['كلمة المرور الحالية', 'كلمة المرور الجديدة', 'تأكيد كلمة المرور'].map(label => (
                    <div key={label}>
                      <label className="block text-sm font-medium text-[var(--text)] mb-1.5">{label}</label>
                      <input type="password" className="input-field w-full" />
                    </div>
                  ))}
                  <button className="btn-primary">تغيير كلمة المرور</button>
                </div>
              </div>
            </div>
          )}

          {section === 'notifications' && (
            <div className="card p-6">
              <h2 className="font-display font-semibold text-lg text-[var(--text)] mb-5">إعدادات الإشعارات</h2>
              <div className="space-y-4">
                {[
                  { label: 'إشعارات الرسائل', desc: 'عند استلام رسائل جديدة' },
                  { label: 'إشعارات المجتمعات', desc: 'نشاط في المجتمعات التي انضممت إليها' },
                  { label: 'إشعارات الكورسات', desc: 'تحديثات في الكورسات المسجلة' },
                  { label: 'إشعارات البريد الإلكتروني', desc: 'ملخص أسبوعي بالبريد' },
                  { label: 'إشعارات الدفع', desc: 'تأكيدات المدفوعات' },
                ].map(({ label, desc }) => (
                  <div key={label} className="flex items-center justify-between py-3 border-b border-[var(--border)] last:border-0">
                    <div>
                      <p className="text-sm font-medium text-[var(--text)]">{label}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">{desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-10 h-5 bg-[var(--border-strong)] rounded-full peer peer-checked:bg-brand-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:right-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-[-20px]" />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'billing' && (
            <div className="card p-6">
              <h2 className="font-display font-semibold text-lg text-[var(--text)] mb-5">الاشتراك والفوترة</h2>
              <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-[var(--text)]">الخطة المجانية</p>
                    <p className="text-sm text-[var(--text-secondary)]">50,000 رمز AI شهرياً</p>
                  </div>
                  <span className="badge-blue">نشط</span>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { name: 'SCS Pro', price: '$9.99', features: ['500K رمز AI', 'كل المميزات', 'دعم أولوية'], highlight: true },
                  { name: 'SCS Team', price: '$29.99', features: ['2M رمز AI', 'كل مميزات Pro', 'إدارة الفريق'], highlight: false },
                ].map(({ name, price, features, highlight }) => (
                  <div key={name} className={cn('card p-5', highlight && 'border-brand-300 dark:border-brand-700')}>
                    {highlight && <span className="badge-blue text-xs mb-3 inline-flex">الأكثر شعبية</span>}
                    <p className="font-display font-bold text-lg text-[var(--text)]">{name}</p>
                    <p className="font-display font-bold text-3xl text-brand-500 my-2">{price}<span className="text-sm font-normal text-[var(--text-tertiary)]">/شهر</span></p>
                    <ul className="space-y-2 mb-4">
                      {features.map(f => <li key={f} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"><span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 text-xs flex items-center justify-center flex-shrink-0">✓</span>{f}</li>)}
                    </ul>
                    <button className={cn('w-full justify-center text-sm', highlight ? 'btn-primary' : 'btn-secondary')}>اشترك الآن</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
