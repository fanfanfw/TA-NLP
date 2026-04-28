import { requireAdminUser } from '../../utils/auth'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)

  const [
    pendingUsers,
    approvedUsers,
    visibleReviews,
    moderatedReviews,
    positiveReviews,
    negativeReviews,
  ] = await Promise.all([
    prisma.user.count({
      where: {
        approvalStatus: 'pending',
        role: 'user',
      },
    }),
    prisma.user.count({
      where: {
        approvalStatus: 'approved',
      },
    }),
    prisma.review.count({
      where: {
        status: 'visible',
      },
    }),
    prisma.review.count({
      where: {
        status: {
          in: ['hidden_by_admin', 'deleted_by_admin'],
        },
      },
    }),
    prisma.review.count({
      where: {
        sentimentLabel: 'positive',
        status: 'visible',
      },
    }),
    prisma.review.count({
      where: {
        sentimentLabel: 'negative',
        status: 'visible',
      },
    }),
  ])

  return {
    counts: {
      pendingUsers,
      approvedUsers,
      visibleReviews,
      moderatedReviews,
      sentiment: {
        positive: positiveReviews,
        negative: negativeReviews,
      },
    },
  }
})
