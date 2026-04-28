import { requireApprovedUser } from '../../utils/auth'
import { classifySentiment } from '../../utils/model-api'
import { prisma } from '../../utils/prisma'
import { assertEditableReviewStatus, reviewUpdateSchema, serializeSavedReview } from '../../utils/reviews'
import { assertRateLimit, assertValidOrigin } from '../../utils/security'
import { fetchTmdbMediaSnapshot } from '../../utils/tmdb'

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

  assertRateLimit({
    key: `review:${user.id}`,
    limit: 10,
    windowMs: 10 * 60 * 1000,
  })

  const parsed = reviewUpdateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Invalid review content.',
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
      statusMessage: 'You can only edit your own reviews.',
    })
  }

  assertEditableReviewStatus(existingReview.status)

  const content = parsed.data.content
  const reviewAction = existingReview.status === 'hidden_by_admin'
    ? 'updated_after_admin_hide'
    : 'updated'
  const [media, classification] = await Promise.all([
    fetchTmdbMediaSnapshot(event, existingReview.tmdbMediaType as 'movie' | 'tv', existingReview.tmdbMediaId),
    classifySentiment(event, content),
  ])

  const review = await prisma.review.update({
    where: { id: reviewId },
    data: {
      tmdbTitleSnapshot: media.title,
      tmdbPosterPathSnapshot: media.posterPath,
      content,
      sentimentLabel: classification.label,
      sentimentConfidence: classification.confidence,
      sentimentScoresJson: classification.scores,
      modelVersion: classification.modelVersion,
      status: 'visible',
      moderationMessage: null,
      moderatedAt: null,
      moderatedById: null,
      history: {
        create: {
          userId: user.id,
          action: reviewAction,
          content,
          sentimentLabel: classification.label,
          sentimentConfidence: classification.confidence,
          status: 'visible',
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
    classification: {
      label: classification.label,
      is_positive: classification.isPositive,
    },
  }
})
