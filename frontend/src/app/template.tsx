'use client'

import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  return (
    <motion.main
      key={pathname}
      initial={{ opacity: 0, scale: 0.98, filter: 'blur(8px)', y: 15 }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', y: 0 }}
      exit={{ opacity: 0, scale: 1.02, filter: 'blur(8px)', y: -15 }}
      transition={{
        type: 'spring',
        stiffness: 150,
        damping: 20,
        mass: 0.8,
      }}
      className="flex-grow flex flex-col min-h-screen origin-top transform-gpu pt-safe"
    >
      {children}
    </motion.main>
  )
}
