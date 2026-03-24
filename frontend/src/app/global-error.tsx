'use client'
import { useEffect } from 'react'
import Link from 'next/link'

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <html lang="ar" dir="rtl">
      <body>
        <div className="min-h-screen flex items-center justify-center p-8 bg-white font-system">
          <div className="text-center max-w-sm">
            <div className="text-8xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold mb-3 text-slate-900">حدث خطأ غير متوقع</h1>
            <p className="text-slate-500 mb-6">نعتذر عن هذا الخطأ. يرجى المحاولة مرة أخرى.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={reset} className="px-6 py-2.5 bg-blue-700 text-white rounded-xl border-none cursor-pointer font-semibold hover:bg-blue-800 transition-colors">
                إعادة المحاولة
              </button>
              <a href="/" className="px-6 py-2.5 bg-slate-100 text-slate-900 rounded-xl no-underline font-semibold hover:bg-slate-200 transition-colors">
                الصفحة الرئيسية
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
