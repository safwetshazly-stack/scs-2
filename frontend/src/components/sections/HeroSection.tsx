'use client'
import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ArrowLeft, Sparkles, Play, MessageSquare, BookOpen, Layers } from 'lucide-react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'

export function HeroSection() {
  const [query, setQuery] = useState('')
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)

  // 3D Parallax Mouse Tracking
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    mouseX.set(x)
    mouseY.set(y)
  }

  // Smooth springs for rotation
  const rotateX = useSpring(useTransform(mouseY, [-500, 500], [15, -15]), { stiffness: 100, damping: 30 })
  const rotateY = useSpring(useTransform(mouseX, [-500, 500], [-15, 15]), { stiffness: 100, damping: 30 })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) router.push(`/main/courses?q=${encodeURIComponent(query)}`)
  }

  return (
    <section 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-[100svh] flex items-center justify-center overflow-hidden pt-20"
      style={{ perspective: '1200px' }}
    >
      {/* Dynamic Aurora Background */}
      <div className="absolute inset-0 -z-10 bg-[var(--bg)] overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-500/20 blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-600/20 blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-emerald-500/10 blur-[100px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
      </div>

      <div className="page-container relative z-10 w-full grid lg:grid-cols-2 gap-12 lg:gap-8 items-center pt-10 lg:pt-0">
        
        {/* Left Content (Text) */}
        <div className="flex flex-col text-right lg:pl-10 relative z-20">
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="inline-flex items-center self-end gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-500 dark:text-brand-300 text-sm font-medium mb-6 backdrop-blur-md"
          >
            <Sparkles size={14} className="animate-pulse" />
            <span>البعد الجديد للتعليم المدمج</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display font-black text-5xl sm:text-6xl lg:text-7xl text-[var(--text)] leading-[1.1] mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-[var(--text)] to-[var(--text-tertiary)]"
          >
            بوابة التعليم <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-l from-brand-600 to-purple-500 drop-shadow-sm">شديدة الذكاء</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-[var(--text-secondary)] text-lg sm:text-xl max-w-lg ml-auto mb-10 leading-relaxed font-medium"
          >
            ليست مجرد كورسات. منصة SCS هي أكاديميتك الخاصة المتكاملة. ابدأ بالتعلم، تناقش في المجتمعات، واستعن بالمحرك الذكي للتفوق.
          </motion.p>

          <motion.form
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            onSubmit={handleSearch}
            className="relative w-full max-w-md ml-auto"
          >
            <div className="flex items-center gap-2 p-2 rounded-2xl bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.1)] focus-within:shadow-[0_8px_32px_rgba(99,102,241,0.2)] focus-within:border-brand-500/50 transition-all duration-300">
              <Search size={20} className="text-brand-500 ml-2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث عن هندسة، طب، برمجة..."
                className="flex-1 bg-transparent text-[var(--text)] placeholder-[var(--text-tertiary)] text-base outline-none h-12 px-2"
                dir="rtl"
              />
              <button 
                type="submit" 
                className="h-12 px-6 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-white font-semibold text-sm shadow-lg hover:shadow-brand-500/25 hover:scale-[1.02] transform transition-all active:scale-[0.98]"
              >
                انطلق
              </button>
            </div>
          </motion.form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="flex items-center justify-end gap-6 mt-12 text-[var(--text-tertiary)] font-medium text-sm"
          >
            <span className="flex items-center gap-2"><Sparkles size={16} className="text-purple-500"/> ذكاء اصطناعي مدمج</span>
            <span className="flex items-center gap-2"><MessageSquare size={16} className="text-emerald-500"/> مجتمعات فورية</span>
            <span className="flex items-center gap-2"><Layers size={16} className="text-blue-500"/> أكاديميات مستقلة</span>
          </motion.div>
        </div>

        {/* Right Content (3D Interactive Isometric Graphic) */}
        <div className="relative h-[500px] lg:h-[650px] w-full hidden md:flex items-center justify-center perspective-[2000px]">
          <motion.div 
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            className="relative w-full h-full flex justify-center items-center"
          >
            
            {/* Core Center Node */}
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 15, stiffness: 100, delay: 0.1 }}
              className="absolute w-40 h-40 bg-gradient-to-tr from-brand-600 to-purple-600 rounded-3xl shadow-[0_0_60px_rgba(99,102,241,0.5)] border border-white/20 flex items-center justify-center backdrop-blur-xl"
              style={{ transform: 'translateZ(100px)' }}
            >
              <div className="text-white text-center">
                <Play size={48} className="mx-auto mb-2 opacity-90" fill="currentColor" />
                <span className="font-bold text-lg tracking-wide">SCS Core</span>
              </div>
            </motion.div>

            {/* Orbiting Isometric Nodes */}
            <motion.div 
              initial={{ scale: 0, x: -100, y: -100 }}
              animate={{ scale: 1, x: 0, y: 0 }}
              transition={{ type: 'spring', damping: 15, delay: 0.3 }}
              className="absolute top-[10%] left-[10%] w-32 h-32 bg-white/10 dark:bg-black/20 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-2xl flex items-center justify-center"
              style={{ transform: 'translateZ(150px) rotate(-10deg)' }}
            >
              <div className="text-center">
                <div className="w-12 h-12 mx-auto bg-emerald-500/20 text-emerald-500 rounded-xl flex items-center justify-center mb-2">
                  <BookOpen size={24} />
                </div>
                <div className="font-semibold text-sm text-[var(--text)]">المسارات</div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ scale: 0, x: 100, y: -50 }}
              animate={{ scale: 1, x: 0, y: 0 }}
              transition={{ type: 'spring', damping: 15, delay: 0.4 }}
              className="absolute top-[20%] right-[5%] w-28 h-28 bg-white/10 dark:bg-black/20 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-2xl flex items-center justify-center"
              style={{ transform: 'translateZ(80px) rotate(15deg)' }}
            >
              <div className="text-center">
                <div className="w-10 h-10 mx-auto bg-purple-500/20 text-purple-500 rounded-xl flex items-center justify-center mb-2">
                  <Sparkles size={20} />
                </div>
                <div className="font-semibold text-xs text-[var(--text)]">SCS AI</div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ scale: 0, x: -50, y: 100 }}
              animate={{ scale: 1, x: 0, y: 0 }}
              transition={{ type: 'spring', damping: 15, delay: 0.5 }}
              className="absolute bottom-[20%] left-[15%] w-36 h-36 bg-white/10 dark:bg-black/20 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-2xl flex items-center justify-center"
              style={{ transform: 'translateZ(200px) rotate(5deg)' }}
            >
              <div className="text-center">
                <div className="w-12 h-12 mx-auto bg-blue-500/20 text-blue-500 rounded-xl flex items-center justify-center mb-2">
                  <MessageSquare size={24} />
                </div>
                <div className="font-semibold text-sm text-[var(--text)]">الدردشة الحية</div>
              </div>
            </motion.div>

            {/* Decorative Connection Lines (SVG) behind nodes */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20 dark:opacity-40" style={{ transform: 'translateZ(0px)' }}>
              <motion.path 
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, ease: 'easeInOut' }}
                d="M 200 150 Q 300 300 450 250" 
                stroke="url(#gradient-line)" fill="none" strokeWidth="2" strokeDasharray="6 6"
              />
              <motion.path 
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, ease: 'easeInOut', delay: 0.5 }}
                d="M 450 250 Q 550 400 350 500" 
                stroke="url(#gradient-line)" fill="none" strokeWidth="2" strokeDasharray="6 6"
              />
              <defs>
                <linearGradient id="gradient-line" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0" />
                  <stop offset="50%" stopColor="#6366f1" stopOpacity="1" />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>

          </motion.div>
        </div>

      </div>
    </section>
  )
}
