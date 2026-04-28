import type { H3Event } from 'h3'
import { createHash, randomBytes } from 'node:crypto'
import process from 'node:process'
import { deleteCookie, getCookie, setCookie } from 'h3'
import { prisma } from './prisma'

export const SESSION_COOKIE_NAME = 'movies_session'
const SESSION_LIFETIME_DAYS = 30
const SESSION_LIFETIME_MS = SESSION_LIFETIME_DAYS * 24 * 60 * 60 * 1000

export function hashSessionToken(rawToken: string) {
  return createHash('sha256').update(rawToken).digest('hex')
}

export function getRawSessionToken(event: H3Event) {
  return getCookie(event, SESSION_COOKIE_NAME) || null
}

export async function createUserSession(event: H3Event, userId: string) {
  const rawToken = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS)

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashSessionToken(rawToken),
      expiresAt,
    },
  })

  setCookie(event, SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
    maxAge: Math.floor(SESSION_LIFETIME_MS / 1000),
  })
}

export async function deleteCurrentSession(event: H3Event) {
  const rawToken = getRawSessionToken(event)

  if (rawToken) {
    await prisma.session.deleteMany({
      where: {
        tokenHash: hashSessionToken(rawToken),
      },
    })
  }

  deleteCookie(event, SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  })
}

export async function resolveSession(event: H3Event) {
  const rawToken = getRawSessionToken(event)
  if (!rawToken)
    return null

  const tokenHash = hashSessionToken(rawToken)
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          approvalStatus: true,
          isActive: true,
          createdAt: true,
        },
      },
    },
  })

  if (!session)
    return null

  if (session.expiresAt <= new Date()) {
    await prisma.session.delete({
      where: { id: session.id },
    })
    return null
  }

  return session
}
