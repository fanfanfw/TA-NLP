import type { H3Event } from 'h3'
import { createError } from 'h3'

interface ModelPredictionResponse {
  label: string
  confidence: number
  scores: Record<string, number>
  is_positive: boolean
  version?: string
}

export interface SentimentClassification {
  label: 'positive' | 'negative'
  confidence: number
  scores: Record<string, number>
  isPositive: boolean
  modelVersion: string | null
}

export function validatePrediction(response: ModelPredictionResponse): SentimentClassification {
  if (response.label !== 'positive' && response.label !== 'negative') {
    throw createError({
      statusCode: 502,
      statusMessage: 'Model returned an unsupported sentiment label.',
    })
  }

  if (typeof response.confidence !== 'number' || Number.isNaN(response.confidence)) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Model returned an invalid confidence score.',
    })
  }

  if (!response.scores || typeof response.scores !== 'object') {
    throw createError({
      statusCode: 502,
      statusMessage: 'Model returned invalid score details.',
    })
  }

  return {
    label: response.label,
    confidence: response.confidence,
    scores: response.scores,
    isPositive: response.is_positive,
    modelVersion: response.version || null,
  }
}

export function isModelValidationError(error: any) {
  return error?.statusCode === 502 && error?.statusMessage?.startsWith('Model returned')
}

export function createRecoverableModelError() {
  return createError({
    statusCode: 502,
    statusMessage: 'Review could not be analyzed right now. Please try again.',
  })
}

export async function classifySentiment(event: H3Event, text: string): Promise<SentimentClassification> {
  const config = useRuntimeConfig(event)

  if (!config.modelApiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Model API key is not configured.',
    })
  }

  try {
    const response = await $fetch<ModelPredictionResponse>('/predict', {
      baseURL: config.modelApiBaseUrl,
      method: 'POST',
      headers: {
        'x-api-key': config.modelApiKey,
      },
      body: { text },
      timeout: 10000,
    })

    return validatePrediction(response)
  }
  catch (error: any) {
    if (isModelValidationError(error))
      throw error

    throw createRecoverableModelError()
  }
}
