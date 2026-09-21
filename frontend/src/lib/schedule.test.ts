import { describe, expect, it } from 'vitest'
import { cycleLecturerState, cycleRoomState } from './schedule'

describe('availability slot cycling', () => {
  it('cycles lecturer slots available → preferred → unavailable', () => {
    expect(cycleLecturerState('available')).toBe('preferred')
    expect(cycleLecturerState('preferred')).toBe('unavailable')
    expect(cycleLecturerState('unavailable')).toBe('available')
  })

  it('cycles room slots available → reserved → unavailable', () => {
    expect(cycleRoomState('available')).toBe('reserved')
    expect(cycleRoomState('reserved')).toBe('unavailable')
    expect(cycleRoomState('unavailable')).toBe('available')
  })
})
