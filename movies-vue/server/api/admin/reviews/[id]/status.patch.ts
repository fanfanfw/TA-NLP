import { z } from 'zod'
import { requireAdminUser } from '../../../../utils/auth'
import { prisma } from '../../../../utils/prisma'
import { assertValidOrigin } from '../../../../utils/security'

const statusUpdateSchema = z.object({
  status: z.enum(['hidden_by_admin', 'deleted_by_admin']),
  moderationMessage: z.string().trim().max(500).optional(),
})

export default defineEventHandler(async (event) => {
  assertValidOrigin(event)
  const admin = await requireAdminUser(event)
  const reviewId = getRouterParam(event, 'id')

  if (!reviewId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Review id is required.',
    })
  }

  const parsed = statusUpdateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Invalid moderation status.',
    })
  }

  const existingReview = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true },
  })

  if (!existingReview) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Review not found.',
    })
  }

  const review = await prisma.review.update({
    where: { id: reviewId },
    data: {
      status: parsed.data.status,
      moderationMessage: parsed.data.moderationMessage || null,
      moderatedAt: new Date(),
      moderatedById: admin.id,
    },
    select: {
      id: true,
      status: true,
      moderationMessage: true,
      moderatedAt: true,
      moderatedById: true,
    },
  })

  return {
    review: {
      ...review,
      moderatedAt: review.moderatedAt?.toISOString() ?? null,
    },
  }
})
