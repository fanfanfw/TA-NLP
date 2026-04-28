import { describe, expect, it } from 'vitest'
import { assertRateLimit } from '~/server/utils/security'

describe('security utilities', () => {
  it('throws 429 when a local rate limit is exceeded', () => {
    const key = `test-rate-limit:${Date.now()}`

    assertRateLimit({ key, limit: 2, windowMs: 1000 })
    assertRateLimit({ key, limit: 2, windowMs: 1000 })

    expect(() => assertRateLimit({ key, limit: 2, windowMs: 1000 })).toThrow('Too many requests.')
  })
})
