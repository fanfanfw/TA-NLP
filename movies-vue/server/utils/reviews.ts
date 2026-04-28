import type { Prisma, ReviewStatus } from '@prisma/client'
import { createError } from 'h3'
import { z } from 'zod'

export const reviewTextSchema = z.string().trim().min(10).max(2000)

export const reviewSubmissionSchema = z.object({
  tmdbMediaType: z.enum(['movie', 'tv']),
  tmdbMediaId: z.string().trim().regex(/^\d+$/),
  content: reviewTextSchema,
})

export const reviewUpdateSchema = z.object({
  content: reviewTextSchema,
})

type ReviewWithUser = Prisma.ReviewGetPayload<{
  include: {
    user: {
      select: {
        id: true
        username: true
      }
    }
  }
}>

type UserReview = Prisma.ReviewGetPayload<{
  select: {
    id: true
    tmdbMediaType: true
    tmdbMediaId: true
    tmdbTitleSnapshot: true
    tmdbPosterPathSnapshot: true
    content: true
    sentimentLabel: true
    status: true
    createdAt: true
    updatedAt: true
    history: {
      select: {
        id: true
        action: true
        content: true
        sentimentLabel: true
        status: true
        createdAt: true
      }
    }
  }
}>

type AdminReview = Prisma.ReviewGetPayload<{
  include: {
    user: {
      select: {
        id: true
        username: true
        email: true
      }
    }
    moderatedBy: {
      select: {
        id: true
        username: true
      }
    }
    history: {
      select: {
        id: true
        action: true
        content: true
        sentimentLabel: true
        sentimentConfidence: true
        status: true
        createdAt: true
      }
    }
  }
}>

export function assertEditableReviewStatus(status: ReviewStatus) {
  if (status === 'deleted_by_admin' || status === 'deleted_by_user') {
    throw createError({
      statusCode: 403,
      statusMessage: 'This review has been deleted and cannot be edited.',
    })
  }
}

export function serializePublicReview(review: ReviewWithUser) {
  const isHidden = review.status === 'hidden_by_admin'
  const isDeletedByAdmin = review.status === 'deleted_by_admin'

  return {
    id: review.id,
    user: {
      id: review.user.id,
      username: review.user.username,
    },
    tmdbMediaType: review.tmdbMediaType,
    tmdbMediaId: review.tmdbMediaId,
    content: isHidden
      ? 'This review has been hidden by an administrator.'
      : isDeletedByAdmin
        ? 'This review was removed by an administrator.'
        : review.content,
    sentimentLabel: review.status === 'visible' ? review.sentimentLabel : null,
    status: review.status,
    isModerationPlaceholder: isHidden || isDeletedByAdmin,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  }
}

export function serializeUserSafeReview(review: UserReview) {
  return {
    id: review.id,
    tmdbMediaType: review.tmdbMediaType,
    tmdbMediaId: review.tmdbMediaId,
    tmdbTitleSnapshot: review.tmdbTitleSnapshot,
    tmdbPosterPathSnapshot: review.tmdbPosterPathSnapshot,
    content: review.content,
    sentimentLabel: review.sentimentLabel,
    status: review.status,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
    history: review.history.map(entry => ({
      id: entry.id,
      action: entry.action,
      content: entry.content,
      sentimentLabel: entry.sentimentLabel,
      status: entry.status,
      createdAt: entry.createdAt.toISOString(),
    })),
  }
}

export function serializeSavedReview(review: {
  id: string
  content: string
  sentimentLabel: string
  status: ReviewStatus
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: review.id,
    content: review.content,
    sentimentLabel: review.sentimentLabel,
    status: review.status,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  }
}

export function serializeAdminReview(review: AdminReview) {
  return {
    id: review.id,
    tmdbMediaType: review.tmdbMediaType,
    tmdbMediaId: review.tmdbMediaId,
    tmdbTitleSnapshot: review.tmdbTitleSnapshot,
    content: review.content,
    sentimentLabel: review.sentimentLabel,
    sentimentConfidence: review.sentimentConfidence,
    sentimentScoresJson: review.sentimentScoresJson,
    modelVersion: review.modelVersion,
    status: review.status,
    moderationMessage: review.moderationMessage,
    moderatedAt: review.moderatedAt?.toISOString() ?? null,
    moderatedBy: review.moderatedBy,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
    user: review.user,
    history: review.history.map(entry => ({
      id: entry.id,
      action: entry.action,
      content: entry.content,
      sentimentLabel: entry.sentimentLabel,
      sentimentConfidence: entry.sentimentConfidence,
      status: entry.status,
      createdAt: entry.createdAt.toISOString(),
    })),
  }
}
