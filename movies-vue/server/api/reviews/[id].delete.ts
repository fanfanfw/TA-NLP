import { requireApprovedUser } from '../../utils/auth'
import { prisma } from '../../utils/prisma'
import { serializeSavedReview } from '../../utils/reviews'
import { assertValidOrigin } from '../../utils/security'

export default defineEventHandler(async (event) => {
  assertValidOrigin(event)
  const user = await requireApprovedUser(event)
  const reviewId = getRouterParam(event, 'id')

  if (!reviewId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Review id is required.',
    })
  }

  const existingReview = await prisma.review.findUnique({
    where: { id: reviewId },
  })

  if (!existingReview) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Review not found.',
    })
  }

  if (existingReview.userId !== user.id) {
    throw createError({
      statusCode: 403,
      statusMessage: 'You can only delete your own reviews.',
    })
  }

  const review = await prisma.review.update({
    where: { id: reviewId },
    data: {
      status: 'deleted_by_user',
      moderationMessage: null,
      moderatedAt: null,
      moderatedById: null,
      history: {
        create: {
          userId: user.id,
          action: 'deleted_by_user',
          content: existingReview.content,
          sentimentLabel: existingReview.sentimentLabel,
          sentimentConfidence: existingReview.sentimentConfidence,
          status: 'deleted_by_user',
        },
      },
    },
    select: {
      id: true,
      content: true,
      sentimentLabel: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return {
    review: serializeSavedReview(review),
  }
})
