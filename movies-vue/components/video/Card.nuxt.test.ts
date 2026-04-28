import type { Video } from '~/types'
import { mount } from '@vue/test-utils'

import { describe, expect, it, vi } from 'vitest'
import { mockVideo } from '~/tests/unit/mocks'
import Card from './Card.vue'

vi.mock('~/composables/item', () => {
  return {
    getVideoLink: (item: Video) => `https://www.youtube.com/watch?v=${item.key}`,
  }
})

describe('card.vue', () => {
  it('renders video details correctly', () => {
    const wrapper = mount(Card, {
      props: {
        item: mockVideo(),
      },
    })

    expect(wrapper.find('[data-testid="video-name"]').text()).toBe(mockVideo().name)
    expect(wrapper.find('[data-testid="video-type"]').text()).toBe(mockVideo().type)
    expect(wrapper.find('[data-testid="video-image"]').attributes('src')).toContain(mockVideo().key)
  })

  it('links directly to YouTube in a new tab', () => {
    const wrapper = mount(Card, {
      props: {
        item: mockVideo(),
      },
    })

    const link = wrapper.find('[data-testid="play-link"]')

    expect(link.attributes('href')).toBe(`https://www.youtube.com/watch?v=${mockVideo().key}`)
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener')
  })
})
