import { z } from 'zod'
import { requireAdminUser } from '../../../../utils/auth'
import { hashPassword } from '../../../../utils/password'
import { prisma } from '../../../../utils/prisma'
import { assertValidOrigin } from '../../../../utils/security'

const adminPasswordUpdateSchema = z.object({
  password: z.string().min(8).max(200),
  confirmPassword: z.string().min(8).max(200),
}).refine(data => data.password === data.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match.',
})

export default defineEventHandler(async (event) => {
  assertValidOrigin(event)
  await requireAdminUser(event)
  const userId = getRouterParam(event, 'userId')

  if (!userId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'User id is required.',
    })
  }

  const parsed = adminPasswordUpdateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Invalid password details.',
    })
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
    },
  })

  if (!targetUser) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found.',
    })
  }

  if (targetUser.role === 'admin') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Admin passwords must be changed from their own profile.',
    })
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: targetUser.id },
      data: {
        passwordHash: await hashPassword(parsed.data.password),
      },
    }),
    prisma.session.deleteMany({
      where: { userId: targetUser.id },
    }),
  ])

  return {
    message: 'Password updated.',
  }
})
