'use client'

import { motion } from 'framer-motion'

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
        mass: 0.5,
      }}
      className="flex-grow flex flex-col min-h-screen"
    >
      {children}
    </motion.main>
  )
}
