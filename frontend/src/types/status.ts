export const statusVariants = ['neutral', 'success', 'warning', 'danger', 'info'] as const

export type StatusVariant = (typeof statusVariants)[number]
