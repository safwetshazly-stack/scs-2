import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-[var(--bg)]">
      <div className="text-center max-w-sm">
        <div className="font-display font-bold text-8xl text-brand-500 mb-4">404</div>
        <h1 className="font-display font-bold text-2xl text-[var(--text)] mb-3">الصفحة غير موجودة</h1>
        <p className="text-[var(--text-secondary)] mb-8">الصفحة التي تبحث عنها غير موجودة أو تم نقلها.</p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/" className="btn-primary">الصفحة الرئيسية</Link>
          <Link href="/main/dashboard" className="btn-secondary">لوحة التحكم</Link>
        </div>
      </div>
    </div>
  )
}
