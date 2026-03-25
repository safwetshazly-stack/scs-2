'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

export default function Loading() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      {/* 3D Rotating Cube/Shapes for SCS */}
      <div className="relative w-24 h-24 perspective-1000">
        <motion.div
          className="w-full h-full relative"
          style={{ transformStyle: 'preserve-3d' }}
          animate={{ rotateY: 360, rotateX: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        >
          {/* Front Face: S */}
          <div className="absolute inset-0 flex items-center justify-center bg-brand-500/20 border border-brand-500/50 rounded-2xl backdrop-blur-md shadow-glow" style={{ transform: 'translateZ(30px)' }}>
            <span className="text-3xl font-display font-bold text-brand-600 dark:text-brand-300">S</span>
          </div>
          {/* Back Face: C */}
          <div className="absolute inset-0 flex items-center justify-center bg-brand-500/20 border border-brand-500/50 rounded-2xl backdrop-blur-md shadow-glow" style={{ transform: 'rotateY(180deg) translateZ(30px)' }}>
            <span className="text-3xl font-display font-bold text-brand-600 dark:text-brand-300">C</span>
          </div>
          {/* Left/Right Shapes */}
          <div className="absolute inset-0 border border-brand-500/30 rounded-full" style={{ transform: 'rotateY(-90deg) translateZ(30px)' }} />
          <div className="absolute inset-0 border border-brand-500/30 rounded-full" style={{ transform: 'rotateY(90deg) translateZ(30px)' }} />
        </motion.div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
          className="text-lg font-medium text-brand-600 dark:text-brand-300"
        >
          جاري المعالجة...
        </motion.p>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2.5 h-2.5 bg-brand-500 rounded-full"
              initial={{ y: 0 }}
              animate={{ y: [-5, 5, -5] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
