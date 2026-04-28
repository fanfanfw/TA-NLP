import { createError, defineEventHandler, setResponseStatus } from 'h3'

const aliases: Record<string, string> = {
  tmdb: 'https://image.tmdb.org/t/p/original/',
  youtube: 'https://img.youtube.com/',
}

export default defineEventHandler(async (event) => {
  const path = event.context.params?.path

  if (!path)
    throw createError({ statusCode: 400, statusMessage: 'Image path is missing' })

  const [, alias, ...imagePath] = path.split('/')
  const baseURL = aliases[alias]

  if (!baseURL || imagePath.length === 0)
    throw createError({ statusCode: 400, statusMessage: `Unsupported image source: ${alias || path}` })

  const response = await fetch(`${baseURL}${imagePath.join('/')}`)

  if (!response.ok) {
    setResponseStatus(event, response.status, response.statusText)
    return { error: `Image request failed: ${response.status} ${response.statusText}` }
  }

  return new Response(await response.arrayBuffer(), {
    headers: {
      'content-type': response.headers.get('content-type') || 'application/octet-stream',
      'cache-control': 'public, max-age=3600, s-maxage=3600',
    },
  })
})
