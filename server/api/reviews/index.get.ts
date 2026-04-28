import { z } from 'zod'
import { getCurrentUser } from '../../utils/auth'
import { prisma } from '../../utils/prisma'
import { serializePublicReview, serializeSavedReview } from '../../utils/reviews'

const listReviewsSchema = z.object({
  type: z.enum(['movie', 'tv']),
  tmdbId: z.string().trim().regex(/^\d+$/),
})

export default defineEventHandler(async (event) => {
  const parsed = listReviewsSchema.safeParse(getQuery(event))

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Valid media type and TMDB id are required.',
    })
  }

  const { type, tmdbId } = parsed.data

  const [reviews, user] = await Promise.all([
    prisma.review.findMany({
      where: {
        tmdbMediaType: type,
        tmdbMediaId: tmdbId,
        status: {
          in: ['visible', 'hidden_by_admin', 'deleted_by_admin'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    }),
    getCurrentUser(event),
  ])

  const currentUserReview = user
    ? await prisma.review.findFirst({
      where: {
        userId: user.id,
        tmdbMediaType: type,
        tmdbMediaId: tmdbId,
        status: {
          in: ['visible', 'hidden_by_admin'],
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
    : null

  return {
    reviews: reviews.map(serializePublicReview),
    currentUserReview: currentUserReview ? serializeSavedReview(currentUserReview) : null,
  }
})
