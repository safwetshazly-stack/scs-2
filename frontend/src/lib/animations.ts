/**
 * SCS Platform - Animation & Transition Utilities
 * 
 * This file provides optimized, performance-conscious animations and transitions
 * that create a smooth, engaging user experience without being heavy on system resources.
 * 
 * PERFORMANCE TIPS:
 * - Uses transform and opacity (GPU-accelerated) instead of position changes
 * - Respects prefers-reduced-motion for accessibility
 * - Doesn't use heavy blur or complex filter chains
 * - Uses CSS variables for easy customization
 */

// ═══════════════════════════════════════════════════════════════════════════════
// FRAMER MOTION ANIMATION PRESETS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fade in and slight upward movement
 * Used for: Section introductions, modal appears, important content
 * Performance: ⭐⭐⭐⭐⭐ Excellent - Only opacity and transform
 */
export const fadeUpVariants = {
  hidden: { 
    opacity: 0, 
    y: 20 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94] // Smooth easing curve
    }
  }
}

/**
 * Staggered children animation
 * Used for: Lists, grids, multiple items appearing in sequence
 * Performance: ⭐⭐⭐⭐⭐ Excellent - Only opacity and transform
 */
export const staggerContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1, // 100ms delay between each child
      delayChildren: 0.2,
    }
  }
}

export const staggerItemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 }
  }
}

/**
 * Slide in from left/right
 * Used for: Modals, sidebars, drawer menus
 * Performance: ⭐⭐⭐⭐⭐ Excellent - Only transform
 */
export const slideInLeftVariants = {
  hidden: { x: -50, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: "easeOut" }
  },
  exit: {
    x: -50,
    opacity: 0,
    transition: { duration: 0.3 }
  }
}

export const slideInRightVariants = {
  hidden: { x: 50, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: "easeOut" }
  },
  exit: {
    x: 50,
    opacity: 0,
    transition: { duration: 0.3 }
  }
}

/**
 * Scale in animation  
 * Used for: Button hovers, card interactions, zoom effects
 * Performance: ⭐⭐⭐⭐⭐ Excellent - Only transform
 */
export const scaleInVariants = {
  hidden: { scale: 0.9, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" }
  }
}

/**
 * Rotate in animation
 * Used for: Loading spinners, icons, attention grabbers
 * Performance: ⭐⭐⭐⭐ Good - Only transform
 */
export const rotateInVariants = {
  hidden: { rotate: -10, opacity: 0 },
  visible: {
    rotate: 0,
    opacity: 1,
    transition: { duration: 0.5 }
  }
}

/**
 * Bounce animation for interactive elements
 * Used for: Button clicks, notifications, alerts
 * Performance: ⭐⭐⭐⭐ Good - Only transform
 */
export const bounceVariants = {
  tap: { scale: 0.95 },
  hover: { scale: 1.05 }
}

/**
 * Pulse animation for attention
 * Used for: Notification badges, live indicators, alerts
 * Performance: ⭐⭐⭐⭐ Good - Only opacity
 */
export const pulseVariants = {
  animate: {
    opacity: [1, 0.5, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
}

/**
 * Shimmer loading effect (skeleton screens)
 * Used for: Loading states, skeleton components
 * Performance: ⭐⭐⭐⭐ Good - Only transform and opacity
 */
export const shimmerVariants = {
  animate: {
    backgroundPosition: ["200% center", "-200% center"],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "linear"
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE TRANSITION ANIMATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Page entrance animation (when navigating to a page)
 * Smooth fade and slight rise effect
 */
export const pageEnterVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  },
  exit: {
    opacity: 0,
    y: 10,
    transition: { duration: 0.3 }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERACTION HOVER EFFECTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Card hover effect
 * Lift and shadow increase on hover
 */
export const cardHoverVariants = {
  initial: { y: 0, boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)" },
  hover: {
    y: -8,
    boxShadow: "0 20px 25px rgba(0, 0, 0, 0.15)",
    transition: { duration: 0.3, ease: "easeOut" }
  }
}

/**
 * Button hover effect
 * Subtle scale and color change
 */
export const buttonHoverVariants = {
  initial: { scale: 1 },
  hover: {
    scale: 1.02,
    transition: { duration: 0.2 }
  },
  tap: {
    scale: 0.98,
    transition: { duration: 0.1 }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BACKDROP & MODAL ANIMATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fade backdrop (for modals)
 */
export const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
}

/**
 * Modal center animation
 */
export const modalVariants = {
  hidden: { 
    opacity: 0,
    scale: 0.9,
    y: 20
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 300
    }
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: 20,
    transition: { duration: 0.2 }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSITION DURATION PRESETS (in seconds)
// ═══════════════════════════════════════════════════════════════════════════════

export const duration = {
  instant: 0.1,      // For very fast interactions (50ms)
  fast: 0.2,        // For quick feedback (200ms)
  medium: 0.3,      // For standard UI transitions (300ms)
  slow: 0.5,        // For important animations (500ms)
  slower: 0.8,      // For emphasis (800ms)
  slowest: 1.2      // For grand entrances (1200ms)
}

// ═══════════════════════════════════════════════════════════════════════════════
// EASING FUNCTION PRESETS
// ═══════════════════════════════════════════════════════════════════════════════

export const easing = {
  // Cubic easing curves (most natural looking)
  easeInCubic: [0.32, 0, 0.67, 0],
  easeOutCubic: [0.33, 1, 0.68, 1],
  easeInOutCubic: [0.65, 0, 0.35, 1],
  
  // Quad easing (smooth, snappy)
  easeOutQuad: [0.25, 0.46, 0.45, 0.94],
  
  // Elastic feel (bouncy)
  elastic: [0.68, -0.55, 0.265, 1.55]
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACCESSIBILITY: PREFERS REDUCED MOTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Helper function to check if user prefers reduced motion
 * Returns a minimal animation config if user has reduced-motion preference
 */
export const getMotionPreference = () => {
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
  return mediaQuery.matches
}

/**
 * Conditional transition that respects user preference
 * If user prefers reduced motion, uses instant/minimal transitions
 */
export const getConditionalTransition = (normalDuration = 0.3, reducedDuration = 0.05) => {
  const prefersReducedMotion = typeof window !== 'undefined' && getMotionPreference()
  return {
    duration: prefersReducedMotion ? reducedDuration : normalDuration
  }
}

export default {
  // Animation variants
  fadeUpVariants,
  staggerContainerVariants,
  staggerItemVariants,
  slideInLeftVariants,
  slideInRightVariants,
  scaleInVariants,
  rotateInVariants,
  bounceVariants,
  pulseVariants,
  shimmerVariants,
  pageEnterVariants,
  
  // Interaction effects
  cardHoverVariants,
  buttonHoverVariants,
  
  // Modal animations
  backdropVariants,
  modalVariants,
  
  // Utilities
  duration,
  easing,
  getMotionPreference,
  getConditionalTransition
}
