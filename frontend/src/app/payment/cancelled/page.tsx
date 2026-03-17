'use client'
import Link from 'next/link'
import { XCircle } from 'lucide-react'

export default function PaymentCancelledPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-[var(--bg-tertiary)]">
      <div className="card p-10 max-w-sm w-full text-center">
        <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-6">
          <XCircle size={40} className="text-red-500" />
        </div>
        <h1 className="font-display font-bold text-2xl text-[var(--text)] mb-3">تم إلغاء الدفع</h1>
        <p className="text-[var(--text-secondary)] mb-8">تم إلغاء عملية الدفع. لم يتم خصم أي مبلغ.</p>
        <div className="flex flex-col gap-3">
          <Link href="/main/courses" className="btn-primary w-full justify-center">
            العودة للكورسات
          </Link>
          <Link href="/main/dashboard" className="btn-secondary w-full justify-center">
            لوحة التحكم
          </Link>
        </div>
      </div>
    </div>
  )
}
