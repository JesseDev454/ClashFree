import type { EventHue } from '../../demo/types'

export type GridDay = {
  key: string
  label: string
  short: string
  note?: string
}

export type GridEventState = 'default' | 'proposed' | 'affected' | 'moved-from'

export type GridEvent = {
  id: string
  day: string
  start: number
  duration: number
  title: string
  subtitle?: string
  meta?: string
  hue: EventHue
  conflict?: boolean
  state?: GridEventState
  badge?: string
  /** Full description used for the accessible name and the hover card. */
  details: { label: string; value: string }[]
  conflictText?: string
}

export type GridTarget = {
  day: string
  start: number
  status: 'current' | 'valid' | 'room-change' | 'invalid'
  /** Short explanation shown while hovering this target. */
  message: string
}

export type GridBlock = {
  id: string
  day: string
  start: number
  end: number
  label: string
}
