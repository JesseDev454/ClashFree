import type { Capability, Role } from '../types/permissions'
import { apiFetch, readError } from './client'

export type AuthUser = {
  id: number
  email: string
  full_name: string
  role: Exclude<Role, 'unauthenticated'>
  department_id: number | null
  department_name: string | null
  cohort_id?: number | null
  is_active?: boolean
  capabilities: Capability[]
  home_path: string
}

export type AuthResponse = {
  user: AuthUser
}

function isAuthUser(value: unknown): value is AuthUser {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'email' in value &&
    'role' in value &&
    'home_path' in value
  )
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const response = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  if (!response.ok) {
    throw new Error(await readError(response))
  }
  const payload: unknown = await response.json()
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('user' in payload) ||
    !isAuthUser(payload.user)
  ) {
    throw new Error('Login returned an unexpected payload')
  }
  return payload.user
}

export async function logout(): Promise<void> {
  await apiFetch('/api/auth/logout', { method: 'POST' })
}

export async function fetchMe(): Promise<AuthUser | null> {
  const response = await apiFetch('/api/me')
  if (response.status === 401) {
    return null
  }
  if (!response.ok) {
    throw new Error(await readError(response))
  }
  const payload: unknown = await response.json()
  return isAuthUser(payload) ? payload : null
}

export async function forgotPassword(email: string): Promise<void> {
  const response = await apiFetch('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
  if (!response.ok) {
    throw new Error(await readError(response))
  }
}

export async function resendVerification(email: string): Promise<void> {
  const response = await apiFetch('/api/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
  if (!response.ok) {
    throw new Error(await readError(response))
  }
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const response = await apiFetch('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })
  if (!response.ok) {
    throw new Error(await readError(response))
  }
}
