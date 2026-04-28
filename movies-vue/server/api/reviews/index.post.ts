import { requireApprovedUser } from '../../utils/auth'
import { classifySentiment } from '../../utils/model-api'
import { prisma } from '../../utils/prisma'
import { reviewSubmissionSchema, serializeSavedReview } from '../../utils/reviews'
import { assertRateLimit, assertValidOrigin } from '../../utils/security'
import { fetchTmdbMediaSnapshot } from '../../utils/tmdb'

export default defineEventHandler(async (event) => {
  assertValidOrigin(event)
  const user = await requireApprovedUser(event)

  assertRateLimit({
    key: `review:${user.id}`,
    limit: 10,
    windowMs: 10 * 60 * 1000,
  })

  const parsed = reviewSubmissionSchema.safeParse(await readBody(event))

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Invalid review details.',
    })
  }

  const { tmdbMediaType, tmdbMediaId, content } = parsed.data
  const existingReview = await prisma.review.findUnique({
    where: {
      userId_tmdbMediaType_tmdbMediaId: {
        userId: user.id,
        tmdbMediaType,
        tmdbMediaId,
      },
    },
  })

  const [media, classification] = await Promise.all([
    fetchTmdbMediaSnapshot(event, tmdbMediaType, tmdbMediaId),
    classifySentiment(event, content),
  ])

  const reviewAction = existingReview
    ? existingReview.status === 'deleted_by_admin'
      ? 'resubmitted_after_admin_removal'
      : 'updated'
    : 'created'

  const review = existingReview
    ? await prisma.review.update({
      where: { id: existingReview.id },
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
    : await prisma.review.create({
      data: {
        userId: user.id,
        tmdbMediaType,
        tmdbMediaId,
        tmdbTitleSnapshot: media.title,
        tmdbPosterPathSnapshot: media.posterPath,
        content,
        sentimentLabel: classification.label,
        sentimentConfidence: classification.confidence,
        sentimentScoresJson: classification.scores,
        modelVersion: classification.modelVersion,
        status: 'visible',
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
