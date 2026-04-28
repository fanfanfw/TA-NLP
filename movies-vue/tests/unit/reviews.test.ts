import { describe, expect, it } from 'vitest'
import { assertEditableReviewStatus, reviewSubmissionSchema, serializeAdminReview, serializePublicReview } from '~/server/utils/reviews'

describe('review utilities', () => {
  it('validates media type, TMDB id, and review length', () => {
    expect(reviewSubmissionSchema.safeParse({
      tmdbMediaType: 'movie',
      tmdbMediaId: '83533',
      content: 'A thoughtful review with enough detail.',
    }).success).toBe(true)

    expect(reviewSubmissionSchema.safeParse({
      tmdbMediaType: 'person',
      tmdbMediaId: '83533',
      content: 'A thoughtful review with enough detail.',
    }).success).toBe(false)

    expect(reviewSubmissionSchema.safeParse({
      tmdbMediaType: 'movie',
      tmdbMediaId: 'abc',
      content: 'A thoughtful review with enough detail.',
    }).success).toBe(false)

    expect(reviewSubmissionSchema.safeParse({
      tmdbMediaType: 'movie',
      tmdbMediaId: '83533',
      content: 'short',
    }).success).toBe(false)
  })

  it('replaces admin-hidden review content with a public placeholder', () => {
    const publicReview = serializePublicReview({
      id: 'review_1',
      user: {
        id: 'user_1',
        username: 'critic',
      },
      tmdbMediaType: 'movie',
      tmdbMediaId: '83533',
      content: 'Original content must not be public.',
      sentimentLabel: 'negative',
      status: 'hidden_by_admin',
      createdAt: new Date('2026-04-25T00:00:00.000Z'),
      updatedAt: new Date('2026-04-25T00:00:00.000Z'),
    } as any)

    expect(publicReview.content).toBe('This review has been hidden by an administrator.')
    expect(publicReview.user.username).toBe('critic')
    expect(publicReview.sentimentLabel).toBeNull()
    expect(publicReview.isModerationPlaceholder).toBe(true)
    expect(publicReview).not.toHaveProperty('sentimentConfidence')
    expect(publicReview).not.toHaveProperty('sentimentScoresJson')
  })

  it('replaces admin-deleted review content with a public placeholder', () => {
    const publicReview = serializePublicReview({
      id: 'review_1',
      user: {
        id: 'user_1',
        username: 'critic',
      },
      tmdbMediaType: 'tv',
      tmdbMediaId: '1399',
      content: 'Original content must not be public.',
      sentimentLabel: 'negative',
      status: 'deleted_by_admin',
      createdAt: new Date('2026-04-25T00:00:00.000Z'),
      updatedAt: new Date('2026-04-25T00:00:00.000Z'),
    } as any)

    expect(publicReview.content).toBe('This review was removed by an administrator.')
    expect(publicReview.user.username).toBe('critic')
    expect(publicReview.sentimentLabel).toBeNull()
    expect(publicReview.isModerationPlaceholder).toBe(true)
  })

  it('blocks user edits for admin-moderated reviews', () => {
    expect(() => assertEditableReviewStatus('visible')).not.toThrow()
    expect(() => assertEditableReviewStatus('deleted_by_user')).not.toThrow()
    expect(() => assertEditableReviewStatus('hidden_by_admin')).toThrow('This review has been moderated and cannot be edited.')
    expect(() => assertEditableReviewStatus('deleted_by_admin')).toThrow('This review has been moderated and cannot be edited.')
  })

  it('keeps model confidence visible only in admin serialization', () => {
    const review = {
      id: 'review_1',
      user: {
        id: 'user_1',
        username: 'critic',
        email: 'critic@example.com',
      },
      moderatedBy: null,
      tmdbMediaType: 'movie',
      tmdbMediaId: '83533',
      tmdbTitleSnapshot: 'The Reviewable Movie',
      tmdbPosterPathSnapshot: null,
      content: 'A thoughtful public review.',
      sentimentLabel: 'positive',
      sentimentConfidence: 0.91,
      sentimentScoresJson: {
        positive: 0.91,
        negative: 0.09,
      },
      modelVersion: 'v1',
      status: 'visible',
      moderationMessage: null,
      moderatedAt: null,
      moderatedById: null,
      history: [],
      createdAt: new Date('2026-04-25T00:00:00.000Z'),
      updatedAt: new Date('2026-04-25T00:00:00.000Z'),
    } as any

    expect(serializePublicReview(review)).not.toHaveProperty('sentimentConfidence')
    expect(serializePublicReview(review)).not.toHaveProperty('sentimentScoresJson')
    expect(serializeAdminReview(review)).toMatchObject({
      sentimentConfidence: 0.91,
      sentimentScoresJson: {
        positive: 0.91,
        negative: 0.09,
      },
      modelVersion: 'v1',
    })
  })

  it('serializes review history for admins', () => {
    const adminReview = serializeAdminReview({
      id: 'review_1',
      user: {
        id: 'user_1',
        username: 'critic',
        email: 'critic@example.com',
      },
      moderatedBy: null,
      tmdbMediaType: 'movie',
      tmdbMediaId: '83533',
      tmdbTitleSnapshot: 'The Reviewable Movie',
      tmdbPosterPathSnapshot: null,
      content: 'Updated review content.',
      sentimentLabel: 'positive',
      sentimentConfidence: 0.91,
      sentimentScoresJson: {
        positive: 0.91,
        negative: 0.09,
      },
      modelVersion: 'v1',
      status: 'visible',
      moderationMessage: null,
      moderatedAt: null,
      moderatedById: null,
      history: [
        {
          id: 'history_1',
          action: 'updated',
          content: 'Updated review content.',
          sentimentLabel: 'positive',
          sentimentConfidence: 0.91,
          status: 'visible',
          createdAt: new Date('2026-04-26T00:00:00.000Z'),
        },
      ],
      createdAt: new Date('2026-04-25T00:00:00.000Z'),
      updatedAt: new Date('2026-04-26T00:00:00.000Z'),
    } as any)

    expect(adminReview.history).toEqual([
      {
        id: 'history_1',
        action: 'updated',
        content: 'Updated review content.',
        sentimentLabel: 'positive',
        sentimentConfidence: 0.91,
        status: 'visible',
        createdAt: '2026-04-26T00:00:00.000Z',
      },
    ])
  })
})
