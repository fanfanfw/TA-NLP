import { z } from 'zod'
import { verifyPassword } from '../../utils/password'
import { prisma } from '../../utils/prisma'
import { assertRateLimit, assertValidOrigin, getClientIp } from '../../utils/security'
import { createUserSession } from '../../utils/session'

const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(200),
})

export default defineEventHandler(async (event) => {
  assertValidOrigin(event)

  const body = await readBody(event)
  const parsed = loginSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Username/email and password are required.',
    })
  }

  const identifier = parsed.data.identifier
  const normalizedIdentifier = identifier.toLowerCase()

  assertRateLimit({
    key: `login:${getClientIp(event)}:${normalizedIdentifier}`,
    limit: 5,
    windowMs: 10 * 60 * 1000,
  })

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: identifier },
        { email: normalizedIdentifier },
      ],
    },
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'No account was found for that username or email.',
    })
  }

  const passwordMatches = await verifyPassword(user.passwordHash, parsed.data.password)
  if (!passwordMatches) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Username/email or password is incorrect.',
    })
  }

  if (!user.isActive) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Your account has been disabled by an administrator.',
      data: { status: 'disabled' },
    })
  }

  if (user.approvalStatus === 'pending') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Your account is waiting for admin approval.',
      data: { status: 'pending' },
    })
  }

  if (user.approvalStatus === 'rejected') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Your account was rejected by an administrator.',
      data: { status: 'rejected' },
    })
  }

  await createUserSession(event, user.id)

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      approvalStatus: user.approvalStatus,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
    },
  }
})
