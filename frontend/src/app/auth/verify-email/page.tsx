'use client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { authAPI } from '@/services/api'

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  useEffect(() => {
    if (!token) { setStatus('error'); return }
    authAPI.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'))
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-[var(--bg-tertiary)]">
      <div className="card p-10 max-w-sm w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 size={48} className="text-brand-500 animate-spin mx-auto mb-5" />
            <h2 className="font-display font-bold text-xl text-[var(--text)]">جاري التحقق...</h2>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={32} className="text-emerald-500" />
            </div>
            <h2 className="font-display font-bold text-xl text-[var(--text)] mb-2">تم التحقق بنجاح!</h2>
            <p className="text-[var(--text-secondary)] text-sm mb-6">بريدك الإلكتروني مفعّل. يمكنك الآن تسجيل الدخول.</p>
            <Link href="/auth/login" className="btn-primary w-full justify-center">تسجيل الدخول</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-5">
              <XCircle size={32} className="text-red-500" />
            </div>
            <h2 className="font-display font-bold text-xl text-[var(--text)] mb-2">فشل التحقق</h2>
            <p className="text-[var(--text-secondary)] text-sm mb-6">الرابط غير صحيح أو انتهت صلاحيته.</p>
            <Link href="/auth/login" className="btn-secondary w-full justify-center">العودة</Link>
          </>
        )}
      </div>
    </div>
  )
}
