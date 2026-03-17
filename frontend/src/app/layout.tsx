import type { Metadata, Viewport } from 'next'
import { DM_Sans, Syne, JetBrains_Mono } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'react-hot-toast'
import { Providers } from '@/components/providers'
import '@/styles/globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  weight: ['400', '500'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'SCS Platform — Learn Together, Grow Together',
    template: '%s | SCS Platform',
  },
  description: 'منصة تعليمية اجتماعية تجمع الطلاب والمعلمين والذكاء الاصطناعي في مجتمع واحد',
  keywords: ['تعليم', 'كورسات', 'ذكاء اصطناعي', 'مجتمعات', 'online learning', 'AI'],
  authors: [{ name: 'SCS Team' }],
  creator: 'SCS Platform',
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'ar_EG',
    alternateLocale: 'en_US',
    url: 'https://scsplatform.com',
    title: 'SCS Platform',
    description: 'منصة تعليمية اجتماعية متكاملة',
    siteName: 'SCS Platform',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SCS Platform',
    description: 'منصة تعليمية اجتماعية متكاملة',
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1A56DB' },
    { media: '(prefers-color-scheme: dark)', color: '#0F1117' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${dmSans.variable} ${syne.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <Providers>
            {children}
          </Providers>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--bg-secondary)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                fontSize: '14px',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
