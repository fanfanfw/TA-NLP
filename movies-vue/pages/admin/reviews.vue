<script setup lang="ts">
import { useAuth } from '~/composables/auth'

type ReviewStatus = 'visible' | 'hidden_by_admin' | 'deleted_by_admin' | 'deleted_by_user'

interface ReviewHistoryEntry {
  id: string
  action: string
  content: string
  sentimentLabel: 'positive' | 'negative'
  sentimentConfidence: number
  status: ReviewStatus
  createdAt: string
}

interface AdminReview {
  id: string
  tmdbMediaType: 'movie' | 'tv'
  tmdbMediaId: string
  tmdbTitleSnapshot: string
  content: string
  sentimentLabel: 'positive' | 'negative'
  sentimentConfidence: number
  sentimentScoresJson: Record<string, number>
  modelVersion: string | null
  status: ReviewStatus
  moderationMessage: string | null
  moderatedAt: string | null
  moderatedBy: {
    id: string
    username: string
  } | null
  createdAt: string
  updatedAt: string
  user: {
    id: string
    username: string
    email: string
  }
  history: ReviewHistoryEntry[]
}

const { user, refreshUser, isAdmin } = useAuth()
const { t } = useI18n()

await refreshUser()

if (!user.value)
  await navigateTo('/login?redirect=/admin/reviews')

if (user.value && !isAdmin.value)
  throw createError({ statusCode: 403, statusMessage: 'Admin access required.' })

const filters = reactive({
  q: '',
  status: 'all',
  sentiment: 'all',
})
const query = computed(() => ({
  q: filters.q || undefined,
  status: filters.status,
  sentiment: filters.sentiment,
}))
const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
const { data, pending, error, refresh } = await useFetch<{ reviews: AdminReview[] }>('/api/admin/reviews', {
  headers,
  query,
  default: () => ({ reviews: [] }),
})
const actionError = ref('')
const busyReviewId = ref('')

function statusLabel(status: AdminReview['status']) {
  if (status === 'visible')
    return t('Visible')
  if (status === 'hidden_by_admin')
    return t('Hidden by admin')
  if (status === 'deleted_by_admin')
    return t('Removed by admin')
  return t('Deleted by user')
}

function historyActionLabel(action: string) {
  if (action === 'created')
    return t('Created')
  if (action === 'updated')
    return t('Updated')
  if (action === 'updated_after_admin_hide')
    return t('Updated after admin hide')
  if (action === 'resubmitted_after_admin_removal')
    return t('Resubmitted after admin removal')
  if (action === 'deleted_by_user')
    return t('Deleted by user')
  return action
}

function confidenceLabel(confidence: number) {
  return `${Math.round(confidence * 1000) / 10}%`
}

function formatScores(scores: Record<string, number>) {
  return JSON.stringify(scores, null, 2)
}

async function updateReviewStatus(reviewId: string, status: 'hidden_by_admin' | 'deleted_by_admin') {
  actionError.value = ''
  busyReviewId.value = reviewId

  try {
    await $fetch(`/api/admin/reviews/${reviewId}/status`, {
      method: 'PATCH',
      body: { status },
    })
    await refresh()
  }
  catch (e: any) {
    actionError.value = e?.statusMessage || e?.data?.message || t('Action failed. Please try again.')
  }
  finally {
    busyReviewId.value = ''
  }
}

useHead({
  title: 'Review moderation',
})
</script>

<template>
  <main min-h-full p6 md:p10 flex="~ col gap8">
    <header flex="~ col gap3">
      <NuxtLink to="/admin" n-link-text w-max>
        {{ $t('Admin dashboard') }}
      </NuxtLink>
      <h1 text-4xl font-serif>
        {{ $t('Review moderation') }}
      </h1>
      <p op60 max-w-3xl>
        {{ $t('Moderate review visibility and inspect model confidence without exposing raw scores to public users.') }}
      </p>
    </header>

    <form flex="~ col lg:row gap3" lg:items-end :aria-busy="pending" @submit.prevent="() => refresh()">
      <label flex="~ col gap2" flex-1>
        <span text-sm op70>{{ $t('Search') }}</span>
        <input v-model="filters.q" type="search" class="ui-control" :placeholder="$t('Title, username, or email')">
      </label>
      <label flex="~ col gap2">
        <span text-sm op70>{{ $t('Status') }}</span>
        <select v-model="filters.status" class="ui-control">
          <option value="all">
            {{ $t('All statuses') }}
          </option>
          <option value="visible">
            {{ $t('Visible') }}
          </option>
          <option value="hidden_by_admin">
            {{ $t('Hidden by admin') }}
          </option>
          <option value="deleted_by_admin">
            {{ $t('Removed by admin') }}
          </option>
          <option value="deleted_by_user">
            {{ $t('Deleted by user') }}
          </option>
        </select>
      </label>
      <label flex="~ col gap2">
        <span text-sm op70>{{ $t('Sentiment') }}</span>
        <select v-model="filters.sentiment" class="ui-control">
          <option value="all">
            {{ $t('All sentiment') }}
          </option>
          <option value="positive">
            {{ $t('Positive') }}
          </option>
          <option value="negative">
            {{ $t('Negative') }}
          </option>
        </select>
      </label>
      <button type="submit" class="ui-button ui-button-primary" h-max focus:outline-primary>
        {{ $t('Apply filters') }}
      </button>
    </form>

    <div v-if="actionError" border="~ red/40" bg-red:10 p4 text-sm text-red:1 role="alert">
      {{ actionError }}
    </div>

    <div v-if="pending" border="~ base" bg-white:5 p5 op70>
      {{ $t('Loading...') }}
    </div>
    <div v-else-if="error" border="~ red/40" bg-red:10 p5 text-red:1 role="alert">
      {{ $t('Reviews could not be loaded right now.') }}
    </div>
    <div v-else-if="!data?.reviews.length" border="~ base" bg-white:5 p5 op70>
      {{ $t('No reviews match these filters.') }}
    </div>
    <div v-else border="~ base" overflow-x-auto aria-label="Review moderation table">
      <table w-full text-left text-sm>
        <thead bg-white:8>
          <tr>
            <th p4 font-normal op70 scope="col">
              {{ $t('Review') }}
            </th>
            <th p4 font-normal op70 scope="col">
              {{ $t('User') }}
            </th>
            <th p4 font-normal op70 scope="col">
              {{ $t('Model') }}
            </th>
            <th p4 font-normal op70 scope="col">
              {{ $t('Status') }}
            </th>
            <th p4 font-normal op70 text-right scope="col">
              {{ $t('Actions') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="review in data.reviews" :key="review.id" border="t base" align-top>
            <td p4 min-w-96>
              <NuxtLink :to="`/${review.tmdbMediaType}/${review.tmdbMediaId}`" n-link text-base>
                {{ review.tmdbTitleSnapshot }}
              </NuxtLink>
              <div mt1 text-xs op55>
                {{ review.tmdbMediaType.toUpperCase() }} · {{ new Date(review.createdAt).toLocaleDateString() }}
              </div>
              <p mt3 line-clamp-3 op80>
                {{ review.content }}
              </p>
              <details v-if="review.history.length" mt3 border="~ base" bg-white:5 p3>
                <summary cursor-pointer text-xs op70 focus:outline-primary>
                  {{ $t('Review history') }} ({{ review.history.length }})
                </summary>
                <div mt3 flex="~ col gap3">
                  <article v-for="entry in review.history" :key="entry.id" border="t base" pt3>
                    <div flex flex-wrap items-center gap2 text-xs>
                      <span font-bold>{{ historyActionLabel(entry.action) }}</span>
                      <span op55>{{ new Date(entry.createdAt).toLocaleString() }}</span>
                      <span border="~ primary/40" px2 py1 capitalize>{{ entry.sentimentLabel }}</span>
                      <span border="~ base" px2 py1>{{ confidenceLabel(entry.sentimentConfidence) }}</span>
                      <span border="~ base" px2 py1>{{ statusLabel(entry.status) }}</span>
                    </div>
                    <p mt2 whitespace-pre-wrap leading-6 op80>
                      {{ entry.content }}
                    </p>
                  </article>
                </div>
              </details>
            </td>
            <td p4 min-w-56>
              <div font-bold>
                {{ review.user.username }}
              </div>
              <div mt1 break-all text-xs op60>
                {{ review.user.email }}
              </div>
            </td>
            <td p4 min-w-52>
              <div flex flex-wrap gap2>
                <span border="~ primary/40" px2 py1 capitalize>{{ review.sentimentLabel }}</span>
                <span border="~ base" px2 py1>{{ confidenceLabel(review.sentimentConfidence) }}</span>
              </div>
              <p v-if="review.sentimentConfidence < 0.6" mt2 text-xs text-yellow>
                {{ $t('The model is unsure about this review.') }}
              </p>
              <details mt3>
                <summary cursor-pointer op70 focus:outline-primary>
                  {{ $t('Raw scores') }}
                </summary>
                <pre mt2 overflow-auto bg-black p3 text-xs>{{ formatScores(review.sentimentScoresJson) }}</pre>
              </details>
              <div v-if="review.modelVersion" mt2 text-xs op55>
                {{ $t('Model version') }}: {{ review.modelVersion }}
              </div>
            </td>
            <td p4 min-w-44>
              <span border="~ base" px2 py1>{{ statusLabel(review.status) }}</span>
              <div v-if="review.moderatedAt" mt3 text-xs op55>
                {{ $t('Moderated') }} {{ new Date(review.moderatedAt).toLocaleDateString() }}
                <span v-if="review.moderatedBy"> {{ $t('by') }} {{ review.moderatedBy.username }}</span>
              </div>
            </td>
            <td p4>
              <div flex justify-end gap2>
                <button
                  type="button"
                  class="ui-button ui-button-primary ui-button-compact"
                  :disabled="!!busyReviewId || review.status !== 'visible'"
                  focus:outline-primary
                  :aria-label="$t('Hide review')"
                  @click="updateReviewStatus(review.id, 'hidden_by_admin')"
                >
                  {{ busyReviewId === review.id ? $t('Working...') : $t('Hide') }}
                </button>
                <button
                  type="button"
                  class="ui-button ui-button-danger ui-button-compact"
                  :disabled="!!busyReviewId || review.status === 'deleted_by_admin'"
                  focus:outline-primary
                  :aria-label="$t('Remove review')"
                  @click="updateReviewStatus(review.id, 'deleted_by_admin')"
                >
                  {{ $t('Remove') }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</template>
