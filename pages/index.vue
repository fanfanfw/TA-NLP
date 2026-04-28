<script setup lang="ts">
import type { MediaType } from '~/types'
import { QUERY_LIST } from '~/constants/lists'

const route = useRoute()
const type = computed(() => route.params.type as MediaType || 'movie')

const queries = computed(() => [
  QUERY_LIST.movie[0],
  QUERY_LIST.tv[0],
])

const AsyncWrapper = defineComponent({
  name: 'AsyncWrapper',
  async setup(_, ctx) {
    let item = null
    let error = ''
    try {
      const list = await listMedia(type.value, queries.value[0].query, 1)
      if (!list.results[0])
        throw new Error('No media is available right now.')
      item = await getMedia(type.value, list.results[0].id)
    }
    catch (e: any) {
      error = e?.statusMessage || e?.data?.message || e?.message || 'Media could not be loaded right now.'
    }
    return () => item
      ? ctx.slots?.default?.({ item })
      : ctx.slots?.fallback?.({ error })
  },
})
</script>

<template>
  <div>
    <AsyncWrapper>
      <template #default="{ item }">
        <NuxtLink :to="`/${type}/${item.id}`">
          <MediaHero :item="item" :show-trailer="false" />
        </NuxtLink>
      </template>
      <template #fallback="{ error }">
        <div min-h-80 flex="~ col gap3" items-center justify-center p6 text-center>
          <div i-ph-warning-circle text-3xl text-primary />
          <p max-w-xl op70>
            {{ error || $t('Error occurred on fetching') }}
          </p>
        </div>
      </template>
    </AsyncWrapper>
    <CarouselAutoQuery
      v-for="query of queries"
      :key="query.type + query.query"
      :query="query"
    />
    <TheFooter />
  </div>
</template>
