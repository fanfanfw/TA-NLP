import type { H3Event } from 'h3'
import { createError, getHeader, getRequestIP } from 'h3'

interface RateLimitBucket {
  count: number
  resetAt: number
}

interface RateLimitOptions {
  key: string
  limit: number
  windowMs: number
}

const buckets = new Map<string, RateLimitBucket>()

export function getClientIp(event: H3Event) {
  return getRequestIP(event, { xForwardedFor: true }) || 'unknown'
}

function normalizeOrigin(origin: string) {
  try {
    const url = new URL(origin)
    return `${url.protocol}//${url.host}`
  }
  catch {
    return origin.replace(/\/$/, '')
  }
}

function getConfiguredOrigins(event: H3Event) {
  const config = useRuntimeConfig(event)
  return String(config.appOrigin || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
    .map(normalizeOrigin)
}

function getRequestOrigin(event: H3Event) {
  const host = getHeader(event, 'host')
  if (!host)
    return null

  const forwardedProto = getHeader(event, 'x-forwarded-proto')?.split(',')[0]?.trim()
  const proto = forwardedProto || ((event.node.req.socket as { encrypted?: boolean }).encrypted ? 'https' : 'http')
  return `${proto}://${host}`
}

export function assertValidOrigin(event: H3Event) {
  const method = event.method.toUpperCase()
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS')
    return

  const origin = getHeader(event, 'origin')
  const allowedOrigins = new Set([
    ...getConfiguredOrigins(event),
    getRequestOrigin(event),
  ].filter(Boolean).map(origin => normalizeOrigin(origin!)))

  if (!origin || !allowedOrigins.has(normalizeOrigin(origin))) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Invalid request origin.',
    })
  }
}

export function assertRateLimit({ key, limit, windowMs }: RateLimitOptions) {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    })
    return
  }

  bucket.count += 1

  if (bucket.count > limit) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
    throw createError({
      statusCode: 429,
      statusMessage: `Too many requests. Try again in ${retryAfter} seconds.`,
    })
  }
}
