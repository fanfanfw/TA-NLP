import { requireAdminUser } from '../../../../utils/auth'
import { prisma } from '../../../../utils/prisma'
import { assertValidOrigin } from '../../../../utils/security'

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

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      approvalStatus: 'rejected',
      approvedAt: null,
      approvedById: admin.id,
    },
    select: {
      id: true,
      username: true,
      email: true,
      approvalStatus: true,
    },
  })

  return { user }
})
