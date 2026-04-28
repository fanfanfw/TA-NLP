import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { requireAdminUser } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'
import { serializeAdminReview } from '../../../utils/reviews'

const adminReviewsQuerySchema = z.object({
  q: z.string().trim().optional(),
  status: z.enum(['all', 'visible', 'hidden_by_admin', 'deleted_by_admin', 'deleted_by_user']).optional(),
  sentiment: z.enum(['all', 'positive', 'negative']).optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)

  const parsed = adminReviewsQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid review filters.',
    })
  }

  const { q, status = 'all', sentiment = 'all' } = parsed.data
  const where: Prisma.ReviewWhereInput = {}

  if (status !== 'all')
    where.status = status

  if (sentiment !== 'all')
    where.sentimentLabel = sentiment

  if (q) {
    where.OR = [
      { tmdbTitleSnapshot: { contains: q, mode: 'insensitive' } },
      { user: { username: { contains: q, mode: 'insensitive' } } },
      { user: { email: { contains: q, mode: 'insensitive' } } },
    ]
  }

  const reviews = await prisma.review.findMany({
    where,
    orderBy: {
      updatedAt: 'desc',
    },
    take: 100,
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
      moderatedBy: {
        select: {
          id: true,
          username: true,
        },
      },
      history: {
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          action: true,
          content: true,
          sentimentLabel: true,
          sentimentConfidence: true,
          status: true,
          createdAt: true,
        },
      },
    },
  })

  return {
    reviews: reviews.map(serializeAdminReview),
  }
})
