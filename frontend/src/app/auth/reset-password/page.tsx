'use client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react'
import { authAPI } from '@/services/api'
import toast from 'react-hot-toast'

const schema = z.object({
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'يجب أن يحتوي على حرف كبير وصغير ورقم'),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, { message: 'كلمات المرور غير متطابقة', path: ['confirm'] })

export default function ResetPasswordPage() {
  const [showPass, setShowPass] = useState(false)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (data: any) => {
    if (!token) return toast.error('رابط غير صحيح')
    setLoading(true)
    try {
      await authAPI.resetPassword({ token, password: data.password })
      setDone(true)
    } finally { setLoading(false) }
  }

  if (done) return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-[var(--bg-tertiary)]">
      <div className="card p-8 max-w-sm w-full text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-5">
          <CheckCircle size={32} className="text-emerald-500" />
        </div>
        <h2 className="font-display font-bold text-xl text-[var(--text)] mb-2">تم التغيير!</h2>
        <p className="text-[var(--text-secondary)] text-sm mb-6">تم تغيير كلمة مرورك بنجاح.</p>
        <Link href="/auth/login" className="btn-primary w-full justify-center">تسجيل الدخول</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-[var(--bg-tertiary)]">
      <div className="w-full max-w-sm">
        <div className="card p-8">
          <h1 className="font-display font-bold text-2xl text-[var(--text)] mb-2">تعيين كلمة مرور جديدة</h1>
          <p className="text-[var(--text-secondary)] text-sm mb-8">اختر كلمة مرور قوية لحماية حسابك.</p>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {[
              { name: 'password', label: 'كلمة المرور الجديدة', err: errors.password },
              { name: 'confirm', label: 'تأكيد كلمة المرور', err: errors.confirm },
            ].map(({ name, label, err }) => (
              <div key={name}>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">{label}</label>
                <div className="relative">
                  <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                  <input {...register(name as any)} type={showPass ? 'text' : 'password'} placeholder="••••••••" className="input-field pr-10 pl-10" dir="ltr" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {err && <p className="text-red-500 text-xs mt-1">{err.message as string}</p>}
              </div>
            ))}
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
