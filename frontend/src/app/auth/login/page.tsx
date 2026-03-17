'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { Eye, EyeOff, Mail, Lock, ArrowLeft, Bot } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import toast from 'react-hot-toast'

const schema = z.object({
  email: z.string().email('بريد إلكتروني غير صحيح'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
})
type LoginForm = z.infer<typeof schema>

export default function LoginPage() {
  const [showPass, setShowPass] = useState(false)
  const { login, isLoading } = useAuthStore()
  const router = useRouter()

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.email, data.password)
      toast.success('مرحباً بعودتك!')
      router.push('/main/dashboard')
    } catch (e: any) {
      // error handled by interceptor
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 mb-10 group">
            <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center">
              <span className="text-white font-display font-bold text-sm">S</span>
            </div>
            <span className="font-display font-bold text-xl text-[var(--text)]">SCS Platform</span>
          </Link>

          <h1 className="font-display font-bold text-2xl text-[var(--text)] mb-2">مرحباً بعودتك</h1>
          <p className="text-[var(--text-secondary)] text-sm mb-8">
            ليس لديك حساب؟{' '}
            <Link href="/auth/register" className="text-brand-500 hover:text-brand-600 font-medium">
              إنشاء حساب جديد
            </Link>
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">البريد الإلكتروني</label>
              <div className="relative">
                <Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="example@email.com"
                  className="input-field pr-10"
                  dir="ltr"
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-[var(--text)]">كلمة المرور</label>
                <Link href="/auth/forgot-password" className="text-xs text-brand-500 hover:text-brand-600">
                  نسيت كلمة المرور؟
                </Link>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="input-field pr-10 pl-10"
                  dir="ltr"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text)]">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center py-3 text-base">
              {isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>
          </form>
        </div>
      </div>

      {/* Right Panel - Decoration */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-gradient-to-br from-brand-500 to-blue-700 p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-20 right-20 w-64 h-64 rounded-full bg-white blur-3xl" />
        </div>
        <div className="relative text-center text-white max-w-sm">
          <div className="w-20 h-20 rounded-3xl bg-white/20 flex items-center justify-center mx-auto mb-8 backdrop-blur-sm">
            <Bot size={40} className="text-white" />
          </div>
          <h2 className="font-display font-bold text-3xl mb-4">SCS AI ينتظرك</h2>
          <p className="text-blue-100 leading-relaxed">
            لخص كتبك، اشرح أكوادك، وأنشئ مشاريعك بمساعدة أقوى نماذج الذكاء الاصطناعي.
          </p>
        </div>
      </div>
    </div>
  )
}
