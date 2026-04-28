import { z } from 'zod'
import { requireAdminUser } from '../../../../utils/auth'
import { prisma } from '../../../../utils/prisma'
import { assertValidOrigin } from '../../../../utils/security'

const activeUpdateSchema = z.object({
  isActive: z.boolean(),
})

export default defineEventHandler(async (event) => {
  assertValidOrigin(event)
  const admin = await requireAdminUser(event)
  const userId = getRouterParam(event, 'userId')

  if (!userId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'User id is required.',
    })
  }

  const parsed = activeUpdateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Valid account status is required.',
    })
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      isActive: true,
    },
  })

  if (!targetUser) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found.',
    })
  }

  if (targetUser.id === admin.id && !parsed.data.isActive) {
    throw createError({
      statusCode: 400,
      statusMessage: 'You cannot disable your own account.',
    })
  }

  if (targetUser.role === 'admin' && !parsed.data.isActive) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Admin accounts cannot be disabled here.',
    })
  }

  const updatedUser = await prisma.user.update({
    where: { id: targetUser.id },
    data: {
      isActive: parsed.data.isActive,
    },
    select: {
      id: true,
      isActive: true,
      updatedAt: true,
    },
  })

  if (!updatedUser.isActive) {
    await prisma.session.deleteMany({
      where: { userId: updatedUser.id },
    })
  }

  return {
    user: {
      id: updatedUser.id,
      isActive: updatedUser.isActive,
      updatedAt: updatedUser.updatedAt.toISOString(),
    },
  }
})
