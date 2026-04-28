import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { requireAdminUser } from '../../utils/auth'
import { prisma } from '../../utils/prisma'

const adminUsersQuerySchema = z.object({
  q: z.string().trim().optional(),
  role: z.enum(['all', 'admin', 'user']).optional(),
  approvalStatus: z.enum(['all', 'pending', 'approved', 'rejected']).optional(),
  activeStatus: z.enum(['all', 'active', 'inactive']).optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)

  const parsed = adminUsersQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid user filters.',
    })
  }

  const { q, role = 'all', approvalStatus = 'all', activeStatus = 'all' } = parsed.data
  const where: Prisma.UserWhereInput = {}

  if (role !== 'all')
    where.role = role

  if (approvalStatus !== 'all')
    where.approvalStatus = approvalStatus

  if (activeStatus !== 'all')
    where.isActive = activeStatus === 'active'

  if (q) {
    where.OR = [
      { username: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ]
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: {
      createdAt: 'desc',
    },
    take: 100,
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      approvalStatus: true,
      isActive: true,
      approvedAt: true,
      createdAt: true,
      _count: {
        select: {
          reviews: true,
        },
      },
    },
  })

  return {
    users: users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      approvalStatus: user.approvalStatus,
      isActive: user.isActive,
      approvedAt: user.approvedAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      reviewCount: user._count.reviews,
    })),
  }
})
