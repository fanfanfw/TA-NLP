import type { H3Event } from 'h3'
import { createError } from 'h3'

interface TmdbMediaResponse {
  id: number | string
  title?: string
  name?: string
  poster_path?: string | null
}

export interface TmdbMediaSnapshot {
  title: string
  posterPath: string | null
}

export async function fetchTmdbMediaSnapshot(event: H3Event, type: 'movie' | 'tv', id: string): Promise<TmdbMediaSnapshot> {
  const config = useRuntimeConfig(event)

  try {
    const media = await $fetch<TmdbMediaResponse>(`/tmdb/${type}/${id}`, {
      baseURL: config.public.apiBaseUrl,
      timeout: 10000,
    })

    const title = media.title || media.name
    if (!title) {
      throw createError({
        statusCode: 502,
        statusMessage: 'TMDB returned an invalid media response.',
      })
    }

    return {
      title,
      posterPath: media.poster_path || null,
    }
  }
  catch (error: any) {
    if (error?.statusCode)
      throw error

    throw createError({
      statusCode: 502,
      statusMessage: 'Media details could not be verified right now.',
    })
  }
}
