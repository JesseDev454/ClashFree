import type { GridDay, GridEvent } from '../../components/timetable/types'
import type { DashboardMetric } from '../../fixtures/adminDashboard'

export type PublicationStage = 'none' | 'draft' | 'published'

export type PublicationSummary = {
  stage: PublicationStage
  publishedVersion?: number
  publishedAt?: string
  publishedBy?: string
  draftChanges?: number
  hardConflicts?: number
  scheduledClasses?: number
}

export type AttentionItem = {
  id: string
  tone: 'danger' | 'warning' | 'info'
  title: string
  detail: string
  href?: string
  actionLabel?: string
}

export type ActivityItem = {
  id: string
  actor: string
  text: string
  at: string
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger'
  href?: string
}

export type WeekPreview = {
  days: GridDay[]
  events: GridEvent[]
  caption: string
}

export type { DashboardMetric }
