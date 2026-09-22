import { describe, expect, it } from 'vitest'
import type { TimetableSlot } from '../../api/timetables'
import { slotsForDate } from '../../lib/todaySchedule'

function slot(weekday: string, start: string): TimetableSlot {
  return {
    id: start.charCodeAt(0),
    assignment_id: 1,
    meeting_index: 0,
    weekday,
    start_period: start,
    end_period: '10:00',
    room_id: 1,
    room_code: 'LH 1',
    course_code: 'SWE 301',
    course_title: 'Software Design',
    lecturer_id: 1,
    lecturer_name: 'Dr. Amina Yusuf',
    cohort_id: 1,
    cohort_code: 'SWE-300-A',
    department_id: 1,
    department_name: 'Software Engineering',
    building: 'Engineering',
  }
}

describe('slotsForDate', () => {
  const slots = [slot('tue', '08:00'), slot('mon', '14:00'), slot('mon', '08:00')]

  it('keeps the weekday of the selected date and sorts by start period', () => {
    expect(slotsForDate(slots, '2026-09-21').map((item) => item.start_period)).toEqual([
      '08:00',
      '14:00',
    ])
  })

  it('returns no classes on a weekend', () => {
    expect(slotsForDate(slots, '2026-09-26')).toEqual([])
  })
})
