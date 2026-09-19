import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../auth/useAuth'
import { CoursesPage } from './CoursesPage'

const department = {
  id: 1,
  code: 'SWE',
  name: 'Software Engineering',
  faculty_id: 1,
  faculty_name: 'Faculty of Computing Studies',
}

const course = {
  id: 10,
  code: 'SWE 401',
  title: 'Software Architecture',
  department_id: 1,
  department_name: 'Software Engineering',
  level: 400,
  units: 3,
  expected_size: 86,
  room_type: 'lecture_hall',
  status: 'ready',
  lecturer_name: 'Dr. Amina Yusuf',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function renderCourses() {
  return render(
    <AuthContext.Provider
      value={{
        user: null,
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
      }}
    >
      <MemoryRouter>
        <CoursesPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('CoursesPage', () => {
  it('validates the create form before calling the API', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/departments')) {
        return jsonResponse([department])
      }
      if (url.includes('/api/courses')) {
        return jsonResponse([course])
      }
      return jsonResponse({ detail: 'unexpected' }, 500)
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    renderCourses()
    await screen.findByText('SWE 401')
    await user.click(screen.getByRole('button', { name: /add course/i }))
    await user.click(screen.getByRole('button', { name: 'Create course' }))
    expect(screen.getByRole('alert')).toHaveTextContent(
      /enter a course code, title and department/i,
    )
    expect(
      fetchMock.mock.calls.some(
        (call) => call[1] && (call[1] as RequestInit).method === 'POST',
      ),
    ).toBe(false)
  })

  it('shows the empty catalogue state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/api/departments')) {
          return jsonResponse([department])
        }
        if (url.includes('/api/courses')) {
          return jsonResponse([])
        }
        return jsonResponse({ detail: 'unexpected' }, 500)
      }),
    )
    renderCourses()
    await waitFor(() => {
      expect(screen.getByText('No courses match these filters.')).toBeInTheDocument()
    })
  })

  it('shows the table error state when the API fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ detail: 'boom' }, 500)),
    )
    renderCourses()
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'The table could not be loaded.',
      )
    })
  })
})
