'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Users, BookOpen, Bot, MessageCircle, ShieldCheck,
  Zap, Globe, TrendingUp, Star, ArrowLeft, CheckCircle,
  Code, FileText, Image, BarChart3
} from 'lucide-react'

// ─── ANIMATION HELPER ────────────────────────────────────
const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }

function SectionTitle({ badge, title, subtitle }: { badge: string; title: string; subtitle: string }) {
  return (
    <div className="text-center max-w-2xl mx-auto mb-16">
      <motion.div initial="hidden" whileInView="visible" variants={fadeUp} viewport={{ once: true }}>
        <span className="badge-blue mb-4 inline-flex">{badge}</span>
        <h2 className="font-display font-bold text-3xl sm:text-4xl text-[var(--text)] mb-4">{title}</h2>
        <p className="text-[var(--text-secondary)] text-lg leading-relaxed">{subtitle}</p>
      </motion.div>
    </div>
  )
}

// ─── STATS ────────────────────────────────────────────────
const stats = [
  { value: '50,000+', label: 'طالب نشط', icon: Users },
  { value: '800+', label: 'كورس متاح', icon: BookOpen },
  { value: '1,200+', label: 'مجتمع نشط', icon: Globe },
  { value: '4.9/5', label: 'تقييم المستخدمين', icon: Star },
]

export function StatsSection() {
  return (
    <section className="py-16 border-y border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="page-container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map(({ value, label, icon: Icon }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-900/20 text-brand-500 mb-3">
                <Icon size={22} />
              </div>
              <div className="font-display font-bold text-3xl text-[var(--text)] mb-1">{value}</div>
              <div className="text-[var(--text-secondary)] text-sm">{label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── FEATURES ─────────────────────────────────────────────
const features = [
  {
    icon: Users,
    title: 'مجتمعات الطلاب',
    description: 'أنشئ أو انضم لمجتمعات تعليمية في تخصصك. قنوات نصية، مناقشات، وملفات مشتركة.',
    color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-500',
  },
  {
    icon: BookOpen,
    title: 'سوق الكورسات',
    description: 'آلاف الكورسات من معلمين محترفين. تتبع تقدمك واحصل على شهادات معتمدة.',
    color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500',
  },
  {
    icon: Bot,
    title: 'SCS AI المدمج',
    description: 'مساعد ذكاء اصطناعي متكامل. لخص الكتب، اشرح الأكواد، وأنشئ مشاريع كاملة.',
    color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-500',
  },
  {
    icon: MessageCircle,
    title: 'دردشة فورية',
    description: 'راسل الطلاب والمعلمين مباشرة. شارك الملفات، الصور، والكتب في ثوانٍ.',
    color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-500',
  },
  {
    icon: ShieldCheck,
    title: 'أمان عالي المستوى',
    description: 'بياناتك محمية بأعلى معايير الأمان. تشفير كامل وحماية من جميع أنواع الهجمات.',
    color: 'bg-red-50 dark:bg-red-900/20 text-red-500',
  },
  {
    icon: Zap,
    title: 'أداء فائق السرعة',
    description: 'منصة مبنية على بنية Microservices قادرة على استيعاب ملايين المستخدمين.',
    color: 'bg-teal-50 dark:bg-teal-900/20 text-teal-500',
  },
]

export function FeaturesSection() {
  return (
    <section className="py-24">
      <div className="page-container">
        <SectionTitle
          badge="المميزات"
          title="كل ما تحتاجه في مكان واحد"
          subtitle="SCS ليست مجرد منصة تعليمية — هي مجتمع متكامل يجمع التعلم، التواصل، والذكاء الاصطناعي."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, description, color }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="card card-hover p-6 group"
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl ${color} mb-5 transition-transform group-hover:scale-110 duration-200`}>
                <Icon size={22} />
              </div>
              <h3 className="font-display font-semibold text-lg text-[var(--text)] mb-2">{title}</h3>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── COMMUNITIES ──────────────────────────────────────────
const communities = [
  { name: 'البرمجة والتطوير', members: '12,400', color: 'from-blue-500 to-blue-600', emoji: '💻' },
  { name: 'الذكاء الاصطناعي', members: '8,900', color: 'from-purple-500 to-purple-600', emoji: '🤖' },
  { name: 'تصميم UI/UX', members: '6,200', color: 'from-pink-500 to-pink-600', emoji: '🎨' },
  { name: 'الطب والصحة', members: '9,800', color: 'from-emerald-500 to-emerald-600', emoji: '🏥' },
  { name: 'الهندسة', members: '7,100', color: 'from-amber-500 to-amber-600', emoji: '⚙️' },
  { name: 'الأعمال والريادة', members: '5,400', color: 'from-teal-500 to-teal-600', emoji: '📈' },
]

export function CommunitiesSection() {
  return (
    <section className="py-24 bg-[var(--bg-secondary)]">
      <div className="page-container">
        <SectionTitle
          badge="المجتمعات"
          title="انضم لمجتمعك التعليمي"
          subtitle="مئات المجتمعات في كل التخصصات. ناقش، تعلم، وتعاون مع طلاب من حول العالم."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {communities.map(({ name, members, color, emoji }, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="card card-hover p-5 cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-xl flex-shrink-0 shadow-md group-hover:scale-110 transition-transform`}>
                  {emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[var(--text)] text-sm mb-1 truncate">{name}</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="flex -space-x-1 rtl:space-x-reverse">
                      {[...Array(3)].map((_, j) => (
                        <div key={j} className="w-5 h-5 rounded-full bg-brand-100 border-2 border-[var(--bg)] flex items-center justify-center text-[8px] text-brand-600 font-bold">{String.fromCharCode(65 + j)}</div>
                      ))}
                    </div>
                    <span className="text-[var(--text-tertiary)] text-xs">{members} عضو</span>
                  </div>
                </div>
                <ArrowLeft size={16} className="text-[var(--text-tertiary)] group-hover:text-brand-500 transition-colors flex-shrink-0" />
              </div>
            </motion.div>
          ))}
        </div>
        <div className="text-center">
          <Link href="/main/communities" className="btn-secondary">
            استكشف جميع المجتمعات
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── COURSES ──────────────────────────────────────────────
const courses = [
  { title: 'تطوير تطبيقات React من الصفر', instructor: 'أحمد محمد', rating: 4.9, students: 3200, price: 49, level: 'مبتدئ', tag: 'برمجة' },
  { title: 'علم البيانات مع Python', instructor: 'سارة أحمد', rating: 4.8, students: 2800, price: 59, level: 'متوسط', tag: 'ذكاء اصطناعي' },
  { title: 'تصميم UI/UX الاحترافي', instructor: 'عمر خالد', rating: 4.9, students: 1900, price: 45, level: 'مبتدئ', tag: 'تصميم' },
  { title: 'Node.js وبناء APIs', instructor: 'منى إبراهيم', rating: 4.7, students: 2100, price: 55, level: 'متقدم', tag: 'برمجة' },
]

export function CoursesSection() {
  return (
    <section className="py-24">
      <div className="page-container">
        <SectionTitle
          badge="الكورسات"
          title="تعلم من أفضل المعلمين"
          subtitle="آلاف الكورسات في مختلف التخصصات. تتبع تقدمك واحصل على شهادات معتمدة."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {courses.map(({ title, instructor, rating, students, price, level, tag }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="course-card group"
            >
              {/* Thumbnail */}
              <div className="h-36 bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-900/20 dark:to-brand-900/40 flex items-center justify-center relative overflow-hidden">
                <BookOpen size={40} className="text-brand-300 dark:text-brand-700 group-hover:scale-110 transition-transform" />
                <span className="absolute top-3 right-3 badge-blue text-xs">{tag}</span>
                <span className="absolute bottom-3 left-3 text-xs px-2 py-0.5 rounded-lg bg-[var(--bg)]/80 text-[var(--text-secondary)]">{level}</span>
              </div>
              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold text-sm text-[var(--text)] mb-2 line-clamp-2 leading-snug">{title}</h3>
                <p className="text-[var(--text-tertiary)] text-xs mb-3">{instructor}</p>
                <div className="flex items-center gap-1 mb-3">
                  <Star size={12} className="fill-amber-400 text-amber-400" />
                  <span className="text-xs font-medium text-[var(--text)]">{rating}</span>
                  <span className="text-[var(--text-tertiary)] text-xs">({students.toLocaleString()})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-brand-500">${price}</span>
                  <button className="btn-primary text-xs px-3 py-1.5 rounded-lg">سجل الآن</button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="text-center">
          <Link href="/main/courses" className="btn-secondary">
            عرض جميع الكورسات
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── AI SECTION ───────────────────────────────────────────
const aiCapabilities = [
  { icon: FileText, label: 'تلخيص الكتب', desc: 'لخص أي كتاب في دقائق' },
  { icon: Code, label: 'شرح الأكواد', desc: 'افهم أي كود بسهولة' },
  { icon: Image, label: 'إنشاء صور', desc: 'صور بالذكاء الاصطناعي' },
  { icon: BarChart3, label: 'تحليل البيانات', desc: 'حلل ملفاتك بذكاء' },
]

export function AISection() {
  return (
    <section className="py-24 bg-[var(--bg-secondary)]">
      <div className="page-container">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <span className="badge-blue mb-4 inline-flex">SCS AI</span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-[var(--text)] mb-6">
              مساعد ذكاء اصطناعي
              <br />
              <span className="gradient-text">مدمج داخل المنصة</span>
            </h2>
            <p className="text-[var(--text-secondary)] text-lg leading-relaxed mb-8">
              SCS AI يستخدم أحدث نماذج الذكاء الاصطناعي (GPT-4 وClaude وDeepSeek) ويختار الأفضل تلقائياً لكل مهمة. كل ذلك تحت اسم SCS AI داخل المنصة.
            </p>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {aiCapabilities.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-3 p-4 rounded-2xl bg-[var(--bg)] border border-[var(--border)]">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-500 flex items-center justify-center flex-shrink-0">
                    <Icon size={18} />
                  </div>
                  <div>
                    <div className="font-medium text-sm text-[var(--text)]">{label}</div>
                    <div className="text-[var(--text-tertiary)] text-xs mt-0.5">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/main/ai" className="btn-primary gap-2">
              جرب SCS AI الآن
              <Bot size={18} />
            </Link>
          </motion.div>

          {/* Right - Chat Preview */}
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <div className="card p-1 shadow-card-hover">
              {/* Header */}
              <div className="flex items-center gap-3 p-4 border-b border-[var(--border)]">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-brand-500 flex items-center justify-center">
                  <Bot size={18} className="text-white" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-[var(--text)]">SCS AI</div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    <span className="text-xs text-emerald-500">متصل</span>
                  </div>
                </div>
              </div>
              {/* Messages */}
              <div className="p-4 space-y-4 min-h-[280px]">
                <div className="flex justify-end">
                  <div className="chat-bubble-out">لخص لي كتاب "الأب الغني الأب الفقير" في 5 نقاط</div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-brand-500 flex items-center justify-center flex-shrink-0">
                    <Bot size={14} className="text-white" />
                  </div>
                  <div className="chat-bubble-in">
                    <p className="font-medium text-xs mb-2 text-[var(--text-secondary)]">ملخص "الأب الغني الأب الفقير":</p>
                    <ul className="space-y-1 text-xs">
                      {['الأصول تضع مالاً في جيبك، الخصوم تأخذ منه', 'الأغنياء لا يعملون من أجل المال بل المال يعمل لهم', 'الذكاء المالي هو المهارة الأهم', 'ابنِ أعمالاً تدرّ دخلاً سلبياً', 'الفرق بين الفقير والغني هو طريقة التفكير'].map((p, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <CheckCircle size={10} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              {/* Input */}
              <div className="p-3 border-t border-[var(--border)]">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                  <input className="flex-1 bg-transparent text-xs text-[var(--text-tertiary)] outline-none" placeholder="اسأل SCS AI أي شيء..." readOnly />
                  <button className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
                    <ArrowLeft size={12} className="text-white" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// ─── TESTIMONIALS ─────────────────────────────────────────
const testimonials = [
  { name: 'أحمد سامي', role: 'مطور برمجيات', text: 'SCS غيّرت طريقة تعلمي بالكامل. المجتمعات والـ AI معاً شيء لا يوجد في أي منصة أخرى.', rating: 5 },
  { name: 'نور الهدى', role: 'طالبة طب', text: 'أفضل منصة تعليمية عربية. الكورسات ممتازة والمجتمع داعم جداً. أنصح بها كل طالب.', rating: 5 },
  { name: 'خالد العمري', role: 'مصمم UX', text: 'الواجهة جميلة وسريعة، وSCS AI وفّر عليّ ساعات من البحث. استثمار حقيقي في التعليم.', rating: 5 },
]

export function TestimonialsSection() {
  return (
    <section className="py-24">
      <div className="page-container">
        <SectionTitle
          badge="آراء المستخدمين"
          title="ماذا يقول طلابنا"
          subtitle="آلاف الطلاب يثقون في SCS لتطوير مهاراتهم وتحقيق أهدافهم."
        />
        <div className="grid sm:grid-cols-3 gap-6">
          {testimonials.map(({ name, role, text, rating }, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="card p-6"
            >
              <div className="flex gap-0.5 mb-4">
                {[...Array(rating)].map((_, j) => (
                  <Star key={j} size={14} className="fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-5">"{text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-sm">
                  {name[0]}
                </div>
                <div>
                  <div className="font-medium text-sm text-[var(--text)]">{name}</div>
                  <div className="text-[var(--text-tertiary)] text-xs">{role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── CTA SECTION ──────────────────────────────────────────
export function CTASection() {
  return (
    <section className="py-24">
      <div className="page-container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-blue-700 p-12 text-center"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-white blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-white blur-3xl" />
          </div>
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 text-white text-sm font-medium mb-6">
              <Sparkles size={14} />
              ابدأ مجاناً اليوم
            </span>
            <h2 className="font-display font-bold text-3xl sm:text-5xl text-white mb-4">
              جاهز لتبدأ رحلتك؟
            </h2>
            <p className="text-blue-100 text-lg max-w-xl mx-auto mb-10">
              انضم لأكثر من 50,000 طالب يتعلمون ويتعاونون على SCS Platform
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link href="/auth/register" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-white text-brand-600 font-semibold text-base hover:shadow-xl transition-all hover:-translate-y-0.5">
                ابدأ مجاناً
                <ArrowLeft size={18} />
              </Link>
              <Link href="/main/communities" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-white/10 text-white font-semibold text-base hover:bg-white/20 transition-all border border-white/20">
                استكشف المنصة
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
