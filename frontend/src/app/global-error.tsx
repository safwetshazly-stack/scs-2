'use client'
import { useEffect } from 'react'
import Link from 'next/link'

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <html lang="ar" dir="rtl">
      <body>
        <div className="min-h-screen flex items-center justify-center p-8" style={{ background: '#fff', fontFamily: 'system-ui' }}>
          <div className="text-center max-w-sm">
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>⚠️</div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px', color: '#0f172a' }}>حدث خطأ غير متوقع</h1>
            <p style={{ color: '#64748b', marginBottom: '24px' }}>نعتذر عن هذا الخطأ. يرجى المحاولة مرة أخرى.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={reset} style={{ padding: '10px 24px', background: '#1A56DB', color: '#fff', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                إعادة المحاولة
              </button>
              <a href="/" style={{ padding: '10px 24px', background: '#f1f5f9', color: '#0f172a', borderRadius: '12px', textDecoration: 'none', fontWeight: 600 }}>
                الصفحة الرئيسية
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
