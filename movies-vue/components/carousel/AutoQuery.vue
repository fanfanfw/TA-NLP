<script setup lang="ts">
import type { QueryItem } from '~/types'

const props = defineProps<{
  query: QueryItem
}>()

const error = ref('')
const item = ref<Awaited<ReturnType<typeof listMedia>> | null>(null)

try {
  item.value = await listMedia(props.query.type, props.query.query, 1)
}
catch (e: any) {
  error.value = e?.statusMessage || e?.data?.message || e?.message || 'Media could not be loaded right now.'
}
</script>

<template>
  <CarouselBase>
    <template #title>
      {{ $t(query.title) }}
    </template>
    <template #more>
      <NuxtLink :to="`/${props.query.type}/category/${props.query.query}`" n-link>
        {{ $t('Explore more') }}
      </NuxtLink>
    </template>
    <div v-if="error" flex="~ gap2" items-center border="~ red/40" bg-red:10 p4 text-sm text-red:1 role="alert">
      <div i-ph-warning-circle />
      <span>{{ error }}</span>
    </div>
    <MediaCard
      v-for="i of item?.results || []"
      :key="i.id"
      :item="i"
      :query="props.query"
      :type="props.query.type"
      flex-1 w-40 md:w-60
    />
  </CarouselBase>
</template>
