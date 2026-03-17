'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, CheckCircle } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

const schema = z.object({
  username: z.string().min(3, 'يجب أن يكون 3 أحرف على الأقل').max(30).regex(/^[a-zA-Z0-9_]+$/, 'أحرف إنجليزية وأرقام و _ فقط'),
  email: z.string().email('بريد إلكتروني غير صحيح'),
  password: z.string().min(8, '8 أحرف على الأقل').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'يجب أن يحتوي على حرف كبير وصغير ورقم'),
  role: z.enum(['USER', 'INSTRUCTOR']),
})
type Form = z.infer<typeof schema>

const strengthChecks = [
  { label: '8 أحرف على الأقل', test: (p: string) => p.length >= 8 },
  { label: 'حرف كبير', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'حرف صغير', test: (p: string) => /[a-z]/.test(p) },
  { label: 'رقم', test: (p: string) => /\d/.test(p) },
]

export default function RegisterPage() {
  const [showPass, setShowPass] = useState(false)
  const [done, setDone] = useState(false)
  const { register: registerUser, isLoading } = useAuthStore()
  const router = useRouter()

  const { register, handleSubmit, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'USER' },
  })

  const password = watch('password', '')
  const role = watch('role')

  const onSubmit = async (data: Form) => {
    try {
      await registerUser(data)
      setDone(true)
    } catch {}
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-emerald-500" />
          </div>
          <h1 className="font-display font-bold text-2xl text-[var(--text)] mb-3">تم التسجيل!</h1>
          <p className="text-[var(--text-secondary)] mb-6">تحقق من بريدك الإلكتروني لتفعيل حسابك.</p>
          <Link href="/auth/login" className="btn-primary">تسجيل الدخول</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-sm py-8">
          <Link href="/" className="flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center">
              <span className="text-white font-display font-bold text-sm">S</span>
            </div>
            <span className="font-display font-bold text-xl text-[var(--text)]">SCS Platform</span>
          </Link>

          <h1 className="font-display font-bold text-2xl text-[var(--text)] mb-2">إنشاء حساب جديد</h1>
          <p className="text-[var(--text-secondary)] text-sm mb-8">
            لديك حساب؟{' '}
            <Link href="/auth/login" className="text-brand-500 hover:text-brand-600 font-medium">تسجيل الدخول</Link>
          </p>

          {/* Role Toggle */}
          <div className="flex gap-2 p-1 bg-[var(--bg-secondary)] rounded-xl mb-6">
            {[{ value: 'USER', label: '🎓 طالب' }, { value: 'INSTRUCTOR', label: '👨‍🏫 معلم' }].map(({ value, label }) => (
              <label key={value} className={cn('flex-1 text-center py-2 rounded-lg text-sm font-medium cursor-pointer transition-all', role === value ? 'bg-[var(--bg)] text-[var(--text)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text)]')}>
                <input type="radio" value={value} {...register('role')} className="sr-only" />
                {label}
              </label>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">اسم المستخدم</label>
              <div className="relative">
                <User size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input {...register('username')} placeholder="ahmed_2024" className="input-field pr-10" dir="ltr" />
              </div>
              {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">البريد الإلكتروني</label>
              <div className="relative">
                <Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input {...register('email')} type="email" placeholder="example@email.com" className="input-field pr-10" dir="ltr" />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">كلمة المرور</label>
              <div className="relative">
                <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input {...register('password')} type={showPass ? 'text' : 'password'} placeholder="••••••••" className="input-field pr-10 pl-10" dir="ltr" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {password && (
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {strengthChecks.map(({ label, test }) => (
                    <div key={label} className={cn('flex items-center gap-1.5 text-xs', test(password) ? 'text-emerald-500' : 'text-[var(--text-tertiary)]')}>
                      <div className={cn('w-1.5 h-1.5 rounded-full', test(password) ? 'bg-emerald-500' : 'bg-[var(--text-tertiary)]')} />
                      {label}
                    </div>
                  ))}
                </div>
              )}
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center py-3 text-base">
              {isLoading ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب'}
            </button>

            <p className="text-center text-xs text-[var(--text-tertiary)]">
              بالتسجيل أنت توافق على{' '}
              <Link href="/terms" className="text-brand-500 hover:underline">شروط الاستخدام</Link>
              {' '}و{' '}
              <Link href="/privacy" className="text-brand-500 hover:underline">سياسة الخصوصية</Link>
            </p>
          </form>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-emerald-500 to-teal-600 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-20 left-20 w-64 h-64 rounded-full bg-white blur-3xl" />
        </div>
        <div className="relative text-white text-center max-w-sm">
          <div className="text-6xl mb-8">🎓</div>
          <h2 className="font-display font-bold text-3xl mb-4">انضم لأكثر من 50,000 طالب</h2>
          <p className="text-emerald-100 leading-relaxed">تعلم، تواصل مع الطلاب، واستخدم قوة الذكاء الاصطناعي في رحلتك التعليمية.</p>
        </div>
      </div>
    </div>
  )
}
