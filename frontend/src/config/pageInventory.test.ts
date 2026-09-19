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
    expect(getAppHref('admin-courses')).toBe('/unavailable/admin-courses')
  })
})
