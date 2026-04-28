import { describe, expect, it } from 'vitest'
import { createRecoverableModelError, isModelValidationError, validatePrediction } from '~/server/utils/model-api'

describe('model API client', () => {
  it('returns a validated sentiment classification', () => {
    expect(validatePrediction({
      label: 'positive',
      confidence: 0.9432,
      scores: {
        negative: 0.0568,
        positive: 0.9432,
      },
      is_positive: true,
      version: 'v1',
    })).toEqual({
      label: 'positive',
      confidence: 0.9432,
      scores: {
        negative: 0.0568,
        positive: 0.9432,
      },
      isPositive: true,
      modelVersion: 'v1',
    })
  })

  it('rejects unsupported model labels', () => {
    expect(() => validatePrediction({
      label: 'mixed',
      confidence: 0.5,
      scores: {
        negative: 0.5,
        positive: 0.5,
      },
      is_positive: false,
    })).toThrow('Model returned an unsupported sentiment label.')
  })

  it('rejects invalid model confidence', () => {
    expect(() => validatePrediction({
      label: 'negative',
      confidence: Number.NaN,
      scores: {
        negative: 0.5,
        positive: 0.5,
      },
      is_positive: false,
    })).toThrow('Model returned an invalid confidence score.')
  })

  it('rejects missing model score details', () => {
    expect(() => validatePrediction({
      label: 'negative',
      confidence: 0.8,
      scores: null as any,
      is_positive: false,
    })).toThrow('Model returned invalid score details.')
  })

  it('distinguishes model validation errors from upstream failures', () => {
    expect(isModelValidationError({
      statusCode: 502,
      statusMessage: 'Model returned an unsupported sentiment label.',
    })).toBe(true)

    expect(isModelValidationError({
      statusCode: 401,
      statusMessage: 'Invalid API key',
    })).toBe(false)

    expect(createRecoverableModelError()).toMatchObject({
      statusCode: 502,
      statusMessage: 'Review could not be analyzed right now. Please try again.',
    })
  })
})
