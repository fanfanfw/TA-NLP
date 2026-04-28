import { requireAdminUser } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)

  const users = await prisma.user.findMany({
    where: {
      approvalStatus: 'pending',
      role: 'user',
    },
    orderBy: {
      createdAt: 'asc',
    },
    select: {
      id: true,
      username: true,
      email: true,
      createdAt: true,
    },
  })

  return {
    users: users.map(user => ({
      ...user,
      createdAt: user.createdAt.toISOString(),
    })),
  }
})
