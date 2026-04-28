import { requireApprovedUser } from '../../utils/auth'
import { prisma } from '../../utils/prisma'
import { serializeUserSafeReview } from '../../utils/reviews'

export default defineEventHandler(async (event) => {
  const user = await requireApprovedUser(event)

  const reviews = await prisma.review.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      updatedAt: 'desc',
    },
    select: {
      id: true,
      tmdbMediaType: true,
      tmdbMediaId: true,
      tmdbTitleSnapshot: true,
      tmdbPosterPathSnapshot: true,
      content: true,
      sentimentLabel: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      history: {
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          action: true,
          content: true,
          sentimentLabel: true,
          status: true,
          createdAt: true,
        },
      },
    },
  })

  return {
    reviews: reviews.map(serializeUserSafeReview),
  }
})
