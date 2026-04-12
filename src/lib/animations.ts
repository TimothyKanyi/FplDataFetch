import { Variants } from "framer-motion";

/**
 * Animation variants for tab content transitions
 */
export const contentVariants: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.3, ease: "easeOut" }
  },
  exit: { 
    opacity: 0, 
    x: -20,
    transition: { duration: 0.2, ease: "easeIn" }
  }
};

/**
 * Stagger animation for list items
 */
export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

/**
 * Individual item animation for staggered lists
 */
export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3 }
  }
};

/**
 * Fade in animation for cards
 */
export const fadeInVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }
  }
};

/**
 * Scale animation for interactive elements
 */
export const scaleVariants: Variants = {
  initial: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 }
};

/**
 * Slide in from bottom animation
 */
export const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }
  }
};

/**
 * Pulse animation for loading states
 */
export const pulseVariants: Variants = {
  initial: { opacity: 1 },
  animate: {
    opacity: [1, 0.5, 1],
    transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
  }
};

/**
 * Spring transition for tab switching
 */
export const springTransition = {
  type: "spring",
  stiffness: 500,
  damping: 35
};

/**
 * Spring transition with less bounce
 */
export const softSpringTransition = {
  type: "spring",
  stiffness: 400,
  damping: 25
};
