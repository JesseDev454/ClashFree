import { describe, expect, it } from 'vitest'
import { homePathFor, initialsFor, safeNextPath } from './paths'

describe('homePathFor', () => {
  it('maps each ClashFree role to its production dashboard', () => {
    expect(homePathFor('timetable_administrator')).toBe('/admin/dashboard')
    expect(homePathFor('department_coordinator')).toBe('/coordinator/dashboard')
    expect(homePathFor('lecturer')).toBe('/lecturer/dashboard')
    expect(homePathFor('facilities_manager')).toBe('/facilities/dashboard')
    expect(homePathFor('student')).toBe('/student/dashboard')
  })

  it('falls back to login for an unknown role', () => {
    expect(homePathFor('unauthenticated')).toBe('/auth/login')
  })
})

describe('safeNextPath', () => {
  it('accepts in-app paths and rejects protocol-relative URLs', () => {
    expect(safeNextPath('/admin/dashboard')).toBe('/admin/dashboard')
    expect(safeNextPath('//evil.example')).toBeNull()
    expect(safeNextPath('https://evil.example')).toBeNull()
  })
})

describe('initialsFor', () => {
  it('uses the first and last name letters', () => {
    expect(initialsFor('Ada Okonkwo')).toBe('AO')
  })
})
