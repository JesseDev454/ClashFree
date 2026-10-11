import type { Transition, Variants } from 'motion/react'

/*
 * Motion presets mirroring the CSS duration tokens in index.css.
 * Every animation communicates state, direction or change; nothing loops.
 * <MotionConfig reducedMotion="user"> in main.tsx turns transforms off for
 * people who prefer reduced motion.
 */
export const easeOut = [0.16, 1, 0.3, 1] as const
export const easeStandard = [0.2, 0, 0, 1] as const

export const durations = {
  press: 0.1,
  hover: 0.14,
  menu: 0.18,
  modal: 0.22,
  page: 0.22,
  panel: 0.26,
  move: 0.36,
  success: 0.32,
} as const

export const transitions = {
  page: { duration: durations.page, ease: easeOut },
  panel: { type: 'spring', stiffness: 420, damping: 40, mass: 0.9 },
  /** Timetable events gliding to a new slot (250–450ms). */
  move: { type: 'spring', stiffness: 260, damping: 30, mass: 0.9 },
  lift: { duration: durations.hover, ease: easeOut },
  success: { duration: durations.success, ease: easeOut },
  fade: { duration: durations.menu, ease: easeStandard },
} satisfies Record<string, Transition>

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: transitions.page },
}

export const listVariants: Variants = {
  animate: { transition: { staggerChildren: 0.035 } },
}

export const listItemVariants: Variants = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0, transition: transitions.fade },
}
