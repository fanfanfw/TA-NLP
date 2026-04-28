import type { Image, Media, Video } from '~/types'
import { useSingleton } from './utils'

export function getTrailer(item: Media) {
  const trailer = item.videos?.results?.find(video => video.type === 'Trailer')
  return getVideoLink(trailer)
}

export function getVideoLink(item?: Video) {
  if (!item?.key)
    return null
  return `https://www.youtube.com/watch?v=${encodeURIComponent(item.key)}`
}

const [
  provideIframeModal,
  useIframeModal,
] = useSingleton<(url: string) => void>()

const [
  provideImageModal,
  useImageModal,
] = useSingleton<(photos: Image[], index: number) => void>()

export {
  provideIframeModal,
  provideImageModal,
  useIframeModal,
  useImageModal,
}
