'use client'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Mail, ArrowRight, CheckCircle } from 'lucide-react'
import { authAPI } from '@/services/api'
import toast from 'react-hot-toast'

const schema = z.object({ email: z.string().email('بريد إلكتروني غير صحيح') })

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (data: any) => {
    setLoading(true)
    try {
      await authAPI.forgotPassword(data.email)
      setSent(true)
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-[var(--bg-tertiary)]">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center gap-2.5 mb-10">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center">
            <span className="text-white font-display font-bold text-sm">S</span>
          </div>
          <span className="font-display font-bold text-xl text-[var(--text)]">SCS Platform</span>
        </Link>

        <div className="card p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-5">
                <CheckCircle size={32} className="text-emerald-500" />
              </div>
              <h2 className="font-display font-bold text-xl text-[var(--text)] mb-2">تم الإرسال!</h2>
              <p className="text-[var(--text-secondary)] text-sm mb-6">تحقق من بريدك الإلكتروني للحصول على رابط إعادة التعيين.</p>
              <Link href="/auth/login" className="btn-secondary w-full justify-center">العودة لتسجيل الدخول</Link>
            </div>
          ) : (
            <>
              <h1 className="font-display font-bold text-2xl text-[var(--text)] mb-2">نسيت كلمة المرور؟</h1>
              <p className="text-[var(--text-secondary)] text-sm mb-8">أدخل بريدك الإلكتروني وسنرسل لك رابط الإعادة.</p>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">البريد الإلكتروني</label>
                  <div className="relative">
                    <Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                    <input {...register('email')} type="email" placeholder="example@email.com" className="input-field pr-10" dir="ltr" />
                  </div>
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message as string}</p>}
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                  {loading ? 'جاري الإرسال...' : 'إرسال رابط الإعادة'}
                </button>
              </form>
              <div className="mt-6 text-center">
                <Link href="/auth/login" className="flex items-center justify-center gap-2 text-sm text-[var(--text-secondary)] hover:text-brand-500 transition-colors">
                  <ArrowRight size={14} />
                  العودة لتسجيل الدخول
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
