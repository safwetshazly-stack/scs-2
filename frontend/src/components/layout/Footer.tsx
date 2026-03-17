import Link from 'next/link'
import { Github, Twitter, Youtube, Instagram } from 'lucide-react'

const footerLinks = {
  المنصة: [
    { label: 'الكورسات', href: '/main/courses' },
    { label: 'المجتمعات', href: '/main/communities' },
    { label: 'الكتب', href: '/main/books' },
    { label: 'SCS AI', href: '/main/ai' },
  ],
  الشركة: [
    { label: 'من نحن', href: '/about' },
    { label: 'وظائف', href: '/careers' },
    { label: 'المدونة', href: '/blog' },
    { label: 'تواصل معنا', href: '/contact' },
  ],
  الدعم: [
    { label: 'مركز المساعدة', href: '/help' },
    { label: 'سياسة الخصوصية', href: '/privacy' },
    { label: 'شروط الاستخدام', href: '/terms' },
    { label: 'الإبلاغ عن مشكلة', href: '/report' },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="page-container py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center">
                <span className="text-white font-display font-bold text-sm">S</span>
              </div>
              <span className="font-display font-bold text-xl text-[var(--text)]">SCS Platform</span>
            </Link>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-6 max-w-xs">
              منصة تعليمية اجتماعية تجمع الكورسات، المجتمعات، والذكاء الاصطناعي في مكان واحد.
            </p>
            <div className="flex items-center gap-3">
              {[
                { icon: Twitter, href: '#', label: 'Twitter' },
                { icon: Youtube, href: '#', label: 'YouTube' },
                { icon: Instagram, href: '#', label: 'Instagram' },
                { icon: Github, href: '#', label: 'GitHub' },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:text-brand-500 hover:border-brand-300 transition-colors"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-display font-semibold text-sm text-[var(--text)] mb-4">{title}</h4>
              <ul className="space-y-3">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className="text-sm text-[var(--text-secondary)] hover:text-brand-500 transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="divider mb-6" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[var(--text-tertiary)]">
          <span>© {new Date().getFullYear()} SCS Platform. جميع الحقوق محفوظة.</span>
          <div className="flex items-center gap-2">
            <span>صُنع بـ</span>
            <span className="text-red-500">♥</span>
            <span>للطلاب العرب</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
