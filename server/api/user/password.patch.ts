import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { hashPassword, verifyPassword } from '../../utils/password'
import { prisma } from '../../utils/prisma'
import { assertValidOrigin } from '../../utils/security'
import { getRawSessionToken, hashSessionToken } from '../../utils/session'

const userPasswordUpdateSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200),
  confirmNewPassword: z.string().min(8).max(200),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  path: ['confirmNewPassword'],
  message: 'Passwords do not match.',
})

export default defineEventHandler(async (event) => {
  assertValidOrigin(event)
  const user = await requireUser(event)

  const parsed = userPasswordUpdateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Invalid password details.',
    })
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      passwordHash: true,
    },
  })

  if (!currentUser) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found.',
    })
  }

  const passwordMatches = await verifyPassword(currentUser.passwordHash, parsed.data.currentPassword)
  if (!passwordMatches) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Current password is incorrect.',
    })
  }

  const rawToken = getRawSessionToken(event)
  const currentTokenHash = rawToken ? hashSessionToken(rawToken) : null

  await prisma.$transaction([
    prisma.user.update({
      where: { id: currentUser.id },
      data: {
        passwordHash: await hashPassword(parsed.data.newPassword),
      },
    }),
    prisma.session.deleteMany({
      where: {
        userId: currentUser.id,
        ...(currentTokenHash ? { tokenHash: { not: currentTokenHash } } : {}),
      },
    }),
  ])

  return {
    message: 'Password updated.',
  }
})
