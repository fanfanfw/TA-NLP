import type { H3Event } from 'h3'
import { createError } from 'h3'
import { deleteCurrentSession, resolveSession } from './session'

export interface AuthUser {
  id: string
  username: string
  email: string
  role: 'admin' | 'user'
  approvalStatus: 'pending' | 'approved' | 'rejected'
  isActive: boolean
  createdAt: Date
}

export async function getCurrentUser(event: H3Event): Promise<AuthUser | null> {
  const session = await resolveSession(event)
  return session?.user ?? null
}

export async function requireUser(event: H3Event) {
  const user = await getCurrentUser(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required.',
    })
  }

  if (!user.isActive) {
    await deleteCurrentSession(event)
    throw createError({
      statusCode: 403,
      statusMessage: 'Your account has been disabled by an administrator.',
      data: { status: 'disabled' },
    })
  }

  return user
}

export async function requireApprovedUser(event: H3Event) {
  const user = await requireUser(event)
  if (user.approvalStatus !== 'approved') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Your account is not approved yet.',
    })
  }
  return user
}

export async function requireAdminUser(event: H3Event) {
  const user = await requireApprovedUser(event)
  if (user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Admin access required.',
    })
  }
  return user
}
