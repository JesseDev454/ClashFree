import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { getAppHref, getPreviewHref, pageInventory } from './pageInventory'
import { capabilities, roles } from '../types/permissions'

const repoRoot = path.resolve(process.cwd(), '..')
const referencesRoot = path.join(repoRoot, 'docs/design-references')

describe('page inventory', () => {
  it('contains exactly 78 screen records', () => {
    expect(pageInventory).toHaveLength(78)
  })

  it('has unique ids and production routes', () => {
    const ids = pageInventory.map((page) => page.id)
    const routes = pageInventory.map((page) => page.route)
    expect(new Set(ids).size).toBe(78)
    expect(new Set(routes).size).toBe(78)
  })

  it('points at existing reference files with role assignments', () => {
    for (const page of pageInventory) {
      expect(
        existsSync(path.join(referencesRoot, page.referenceFile)),
        page.referenceFile,
      ).toBe(true)
      expect(page.roles.length).toBeGreaterThan(0)
      expect(page.roles.every((role) => roles.includes(role))).toBe(true)
      expect(
        page.capabilities.every((capability) => capabilities.includes(capability)),
      ).toBe(true)
      expect(page.phase).toBeGreaterThanOrEqual(0)
      expect(page.phase).toBeLessThanOrEqual(12)
      expect(page.width).toBeGreaterThan(0)
      expect(page.height).toBeGreaterThan(0)
    }
  })

  it('reserves generate, repair approval and publishing for the administrator', () => {
    const privileged = pageInventory.filter((page) =>
      page.capabilities.some((capability) =>
        ['generate', 'approveRepair', 'publish'].includes(capability),
      ),
    )
    expect(privileged.length).toBeGreaterThan(0)
    for (const page of privileged) {
      expect(page.roles).toEqual(['timetable_administrator'])
    }
  })

  it('does not put preview routes in the 78-screen inventory', () => {
    expect(pageInventory.every((page) => !page.route.startsWith('/preview/'))).toBe(true)
    expect(getPreviewHref('admin-dashboard')).toBe('/preview/admin/dashboard')
    expect(getPreviewHref('admin-courses')).toBe('/preview/unavailable/admin-courses')
    expect(getAppHref('admin-dashboard')).toBe('/admin/dashboard')
    expect(getAppHref('lecturer-dashboard')).toBe('/lecturer/dashboard')
    expect(getAppHref('admin-courses')).toBe('/admin/courses')
    expect(getAppHref('admin-academic-sessions')).toBe('/admin/academic-sessions')
    expect(getAppHref('admin-faculties-departments')).toBe('/admin/faculties-departments')
    expect(getAppHref('admin-student-cohorts')).toBe('/admin/student-cohorts')
    expect(getAppHref('admin-lecturers')).toBe('/admin/lecturers')
    expect(getAppHref('admin-rooms-facilities')).toBe('/admin/rooms-facilities')
    expect(getAppHref('admin-course-assignments')).toBe('/admin/course-assignments')
    expect(getAppHref('admin-scheduling-constraints')).toBe(
      '/admin/scheduling-constraints',
    )
    expect(getAppHref('admin-constraint-weights')).toBe('/admin/constraint-weights')
    expect(getAppHref('lecturer-availability')).toBe('/lecturer/availability')
    expect(getAppHref('lecturer-scheduling-preferences')).toBe(
      '/lecturer/scheduling-preferences',
    )
    expect(getAppHref('facilities-room-availability')).toBe(
      '/facilities/room-availability',
    )
    expect(getAppHref('admin-generate-timetable')).toBe('/admin/generate-timetable')
    expect(getAppHref('admin-generation-results')).toBe('/admin/generation-results')
    expect(getAppHref('admin-master-timetable')).toBe('/admin/master-timetable')
    expect(getAppHref('admin-conflict-monitor')).toBe('/admin/conflict-monitor')
    expect(getAppHref('admin-publish-timetable')).toBe('/admin/publish-timetable')
    expect(getAppHref('admin-timetable-versions')).toBe('/admin/timetable-versions')
    expect(getAppHref('admin-change-review')).toBe('/admin/change-review')
    expect(getAppHref('admin-disruption-centre')).toBe('/admin/disruption-centre')
    expect(getAppHref('lecturer-report-unavailability')).toBe(
      '/lecturer/report-unavailability',
    )
    expect(getAppHref('facilities-report-disruption')).toBe(
      '/facilities/report-disruption',
    )
    expect(getAppHref('facilities-room-status')).toBe('/facilities/room-status')
    expect(getAppHref('facilities-affected-classes')).toBe('/facilities/affected-classes')
    expect(getAppHref('facilities-maintenance-schedule')).toBe(
      '/facilities/maintenance-schedule',
    )
    expect(getAppHref('admin-repair-timetable')).toBe('/admin/repair-timetable')
    expect(getAppHref('admin-repair-comparison')).toBe('/admin/repair-comparison')
    for (const page of pageInventory.filter((item) => item.phase === 9)) {
      expect(getAppHref(page.id)).toBe(page.route)
    }
    for (const page of pageInventory.filter((item) => item.phase === 10)) {
      expect(getAppHref(page.id)).toBe(page.route)
    }
    expect(getPreviewHref('admin-generate-timetable')).toBe(
      '/preview/unavailable/admin-generate-timetable',
    )
    expect(getPreviewHref('admin-publish-timetable')).toBe(
      '/preview/unavailable/admin-publish-timetable',
    )
    expect(getAppHref('facilities-rooms')).toBe('/unavailable/facilities-rooms')
    expect(getPreviewHref('admin-rooms-facilities')).toBe(
      '/preview/unavailable/admin-rooms-facilities',
    )
    expect(getPreviewHref('admin-scheduling-constraints')).toBe(
      '/preview/unavailable/admin-scheduling-constraints',
    )
  })
})
