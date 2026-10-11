import { describe, expect, it } from 'vitest'
import { b12MaintenanceClosure, initialSessions } from './data'
import {
  affectedByClosure,
  checkPlacement,
  detectConflicts,
  planRepairOptions,
  slotVerdicts,
} from './engine'
import type { RoomClosure } from './types'

const closure: RoomClosure = {
  ...b12MaintenanceClosure,
  reportedAt: '2026-10-12T09:00:00Z',
}
const byId = (id: string) => initialSessions.find((session) => session.id === id)!

describe('demo constraint engine', () => {
  it('finds exactly the deliberate Room A08 double-booking in the seed timetable', () => {
    const conflicts = detectConflicts(initialSessions)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].kind).toBe('room')
    expect(conflicts[0].title).toBe('Room A08 double-booked')
    expect(conflicts[0].sessionIds).toEqual(['s10', 's11'])
  })

  it('explains violations in plain language', () => {
    const reasons = checkPlacement(
      byId('s08'),
      { day: 'wed', start: 10 * 60, roomId: 'A08' },
      initialSessions,
    ).map((violation) => violation.message)
    expect(reasons).toContain('Room A08 seats 60; SEN 403 expects 78 students.')
    expect(
      reasons.some((reason) =>
        reason.startsWith('Mrs. Ngozi Eze is unavailable on Wednesday'),
      ),
    ).toBe(true)
    expect(reasons).toContain('SEN 400L already has SEN 405 at this time (10:00–12:00).')
  })

  it('reports the B12 closure as five affected classes', () => {
    const affected = affectedByClosure(initialSessions, closure).map(
      (session) => session.id,
    )
    expect(affected.sort()).toEqual(['s13', 's14', 's18', 's19', 's23'])
    const conflicts = detectConflicts(initialSessions, [closure])
    expect(conflicts.filter((conflict) => conflict.kind === 'closure')).toHaveLength(5)
  })

  it('plans distinct, fully valid repair options with the least disruptive first', () => {
    const options = planRepairOptions(initialSessions, [closure], closure)
    expect(options.length).toBeGreaterThanOrEqual(2)
    for (const option of options) {
      expect(option.unresolvedIds).toEqual([])
      expect(option.hardViolations).toBe(0)
      expect(option.checks.every((check) => check.passed)).toBe(true)
      const remaining = detectConflicts(option.schedule, [closure])
      expect(remaining.map((conflict) => conflict.id)).toEqual(
        detectConflicts(initialSessions).map((conflict) => conflict.id),
      )
    }
    expect(options[0].id).toBe('same-time')
    expect(options[0].recommended).toBe(true)
    expect(options[0].metrics.timeChanges).toBe(0)
    expect(options[0].metrics.classesMoved).toBe(5)
    const keepRoom = options.find((option) => option.id === 'keep-room')
    expect(keepRoom?.metrics.roomChanges).toBe(0)
    expect(keepRoom?.metrics.timeChanges).toBe(5)
  })

  it('marks drop targets as valid, room-change or invalid with reasons', () => {
    const verdicts = slotVerdicts(byId('s11'), initialSessions)
    const current = verdicts.find((verdict) => verdict.status === 'current')
    expect(current).toMatchObject({ day: 'tue', start: 14 * 60 })
    expect(verdicts.some((verdict) => verdict.status === 'valid')).toBe(true)
    const clash = verdicts.find(
      (verdict) => verdict.day === 'mon' && verdict.start === 10 * 60,
    )
    expect(clash?.status).toBe('invalid')
    expect(clash?.reasons[0].message).toMatch(/INS 400L already has INS 401/)
  })
})
