'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-[var(--bg-tertiary)]">
      <div className="card p-10 max-w-sm w-full text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-emerald-500" />
        </div>
        <h1 className="font-display font-bold text-2xl text-[var(--text)] mb-3">تم الدفع بنجاح! 🎉</h1>
        <p className="text-[var(--text-secondary)] mb-8">تمت عملية الدفع بنجاح. يمكنك الآن الوصول إلى المحتوى.</p>
        <div className="flex flex-col gap-3">
          <Link href="/main/dashboard" className="btn-primary w-full justify-center">
            الذهاب للوحة التحكم
          </Link>
          <Link href="/main/courses" className="btn-secondary w-full justify-center">
            استكشف المزيد
          </Link>
        </div>
      </div>
    </div>
  )
}
