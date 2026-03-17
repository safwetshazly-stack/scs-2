import nodemailer from 'nodemailer'
import { env } from '../config/env'
import { logger } from './logger'

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
})

const baseTemplate = (content: string) => `
<!DOCTYPE html><html dir="rtl" lang="ar">
<head><meta charset="utf-8"><style>
body{font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:0}
.container{max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)}
.header{background:linear-gradient(135deg,#1A56DB,#1341B3);padding:32px;text-align:center}
.header h1{color:#fff;margin:0;font-size:24px;font-weight:700}
.body{padding:32px}
.btn{display:inline-block;padding:14px 28px;background:#1A56DB;color:#fff!important;text-decoration:none;border-radius:12px;font-weight:600;margin:20px 0}
.footer{text-align:center;padding:20px;color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0}
</style></head>
<body><div class="container"><div class="header"><h1>SCS Platform</h1></div>
<div class="body">${content}</div>
<div class="footer">© ${new Date().getFullYear()} SCS Platform. جميع الحقوق محفوظة.</div>
</div></body></html>`

export async function sendVerificationEmail(email: string, token: string, username: string) {
  const url = `${env.FRONTEND_URL}/auth/verify-email?token=${token}`
  try {
    await transporter.sendMail({
      from: env.EMAIL_FROM, to: email,
      subject: 'تحقق من بريدك الإلكتروني - SCS Platform',
      html: baseTemplate(`<h2>مرحباً ${username}!</h2><p>شكراً لتسجيلك في SCS Platform. يرجى تأكيد بريدك الإلكتروني للبدء.</p><p><a href="${url}" class="btn">تأكيد البريد الإلكتروني</a></p><p style="color:#94a3b8;font-size:13px">الرابط صالح لمدة 24 ساعة. إذا لم تقم بهذا الطلب، يمكنك تجاهل هذا البريد.</p>`),
    })
  } catch (e) { logger.error('Failed to send verification email:', e) }
}

export async function sendPasswordResetEmail(email: string, token: string, username: string) {
  const url = `${env.FRONTEND_URL}/auth/reset-password?token=${token}`
  try {
    await transporter.sendMail({
      from: env.EMAIL_FROM, to: email,
      subject: 'إعادة تعيين كلمة المرور - SCS Platform',
      html: baseTemplate(`<h2>مرحباً ${username}!</h2><p>تلقينا طلباً لإعادة تعيين كلمة مرور حسابك.</p><p><a href="${url}" class="btn">إعادة تعيين كلمة المرور</a></p><p style="color:#94a3b8;font-size:13px">الرابط صالح لمدة ساعة واحدة فقط. إذا لم تطلب ذلك، يمكنك تجاهل هذا البريد بأمان.</p>`),
    })
  } catch (e) { logger.error('Failed to send password reset email:', e) }
}
