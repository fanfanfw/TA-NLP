<script setup lang="ts">
import { useAuth } from '~/composables/auth'

interface UserReview {
  id: string
  tmdbMediaType: 'movie' | 'tv'
  tmdbMediaId: string
  tmdbTitleSnapshot: string
  tmdbPosterPathSnapshot: string | null
  content: string
  sentimentLabel: string
  status: 'visible' | 'hidden_by_admin' | 'deleted_by_admin' | 'deleted_by_user'
  createdAt: string
  updatedAt: string
  history: ReviewHistoryEntry[]
}

interface ReviewHistoryEntry {
  id: string
  action: string
  content: string
  sentimentLabel: string
  status: UserReview['status']
  createdAt: string
}

const { user, refreshUser, isAdmin } = useAuth()
const { t } = useI18n()

await refreshUser()

if (!user.value)
  await navigateTo('/login?redirect=/profile')

const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
const { data: reviewsData, refresh: refreshReviews } = await useFetch<{ reviews: UserReview[] }>('/api/user/reviews', {
  headers,
  default: () => ({ reviews: [] }),
})
const busyReviewId = ref('')
const reviewError = ref('')
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmNewPassword: '',
})
const passwordLoading = ref(false)
const passwordError = ref('')
const passwordMessage = ref('')

function statusLabel(status: UserReview['status']) {
  if (status === 'visible')
    return t('Visible')
  if (status === 'hidden_by_admin')
    return t('Hidden by admin')
  if (status === 'deleted_by_admin')
    return t('Removed by admin')
  return t('Deleted')
}

function historyActionLabel(action: string) {
  if (action === 'created')
    return t('Created')
  if (action === 'updated_after_admin_hide')
    return t('Updated after admin hide')
  if (action === 'resubmitted_after_admin_removal')
    return t('Resubmitted after admin removal')
  return t('Updated')
}

async function deleteReview(reviewId: string) {
  reviewError.value = ''
  busyReviewId.value = reviewId

  try {
    await $fetch(`/api/reviews/${reviewId}`, {
      method: 'DELETE',
    })
    await refreshReviews()
  }
  catch (e: any) {
    reviewError.value = e?.statusMessage || e?.data?.message || t('Review could not be deleted. Please try again.')
  }
  finally {
    busyReviewId.value = ''
  }
}

function getApiErrorMessage(e: any, fallback: string) {
  return e?.data?.statusMessage || e?.statusMessage || e?.data?.message || fallback
}

async function updatePassword() {
  passwordError.value = ''
  passwordMessage.value = ''

  if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
    passwordError.value = t('Passwords do not match.')
    return
  }

  passwordLoading.value = true

  try {
    await $fetch('/api/user/password', {
      method: 'PATCH',
      body: {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmNewPassword: passwordForm.confirmNewPassword,
      },
    })
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmNewPassword = ''
    passwordMessage.value = t('Password updated.')
  }
  catch (e: any) {
    passwordError.value = getApiErrorMessage(e, t('Password could not be updated. Please try again.'))
  }
  finally {
    passwordLoading.value = false
  }
}

useHead({
  title: 'Profile',
})
</script>

<template>
  <main v-if="user" min-h-full p5 md:p10 flex="~ col gap8" max-w-360 mx-auto>
    <header flex="~ col gap3" max-w-3xl>
      <h1 text-4xl font-serif>
        {{ $t('Profile') }}
      </h1>
      <p op60>
        {{ $t('Account and review activity.') }}
      </p>
    </header>

    <div grid="~ cols-1 xl:cols-[minmax(20rem,24rem)_minmax(0,1fr)] gap8" items-start>
      <aside flex="~ col gap5" xl:sticky xl:top-10>
        <section border="~ base" bg-white:5 p5>
          <div flex items-start justify-between gap4>
            <div>
              <p text-sm op60>
                {{ $t('Username') }}
              </p>
              <h2 mt1 text-2xl font-serif break-all>
                {{ user.username }}
              </h2>
            </div>
            <span border="~ primary/40" px2 py1 text-xs capitalize>
              {{ user.role }}
            </span>
          </div>

          <dl mt6 grid="~ cols-1 gap4">
            <div border="t base" pt4>
              <dt text-sm op60>
                {{ $t('Email') }}
              </dt>
              <dd mt1 text-base break-all>
                {{ user.email }}
              </dd>
            </div>
            <div grid="~ cols-2 gap4" border="t base" pt4>
              <div>
                <dt text-sm op60>
                  {{ $t('Approval status') }}
                </dt>
                <dd mt1 text-base capitalize>
                  {{ user.approvalStatus }}
                </dd>
              </div>
              <div>
                <dt text-sm op60>
                  {{ $t('Account status') }}
                </dt>
                <dd mt1 text-base>
                  {{ user.isActive ? $t('Active') : $t('Disabled') }}
                </dd>
              </div>
            </div>
            <div border="t base" pt4>
              <dt text-sm op60>
                {{ $t('Joined') }}
              </dt>
              <dd mt1 text-base>
                {{ new Date(user.createdAt).toLocaleDateString() }}
              </dd>
            </div>
          </dl>
        </section>

        <section border="~ base" bg-white:5 p5>
          <form flex="~ col gap4" :aria-busy="passwordLoading" @submit.prevent="updatePassword">
            <div>
              <h2 text-2xl font-serif>
                {{ $t('Change password') }}
              </h2>
              <p mt1 text-sm leading-6 op60>
                {{ $t('Update your password without signing out of this device.') }}
              </p>
            </div>

            <div v-if="passwordMessage" border="~ primary/40" bg-primary:10 p4 text-sm role="status">
              {{ passwordMessage }}
            </div>
            <div v-if="passwordError" border="~ red/40" bg-red:10 p4 text-sm text-red:1 role="alert">
              {{ passwordError }}
            </div>

            <div grid="~ cols-1 gap3">
              <label flex="~ col gap2">
                <span text-sm op70>{{ $t('Current password') }}</span>
                <input v-model="passwordForm.currentPassword" class="ui-control" type="password" required autocomplete="current-password">
              </label>
              <label flex="~ col gap2">
                <span text-sm op70>{{ $t('New password') }}</span>
                <input v-model="passwordForm.newPassword" class="ui-control" type="password" minlength="8" required autocomplete="new-password">
              </label>
              <label flex="~ col gap2">
                <span text-sm op70>{{ $t('Confirm new password') }}</span>
                <input v-model="passwordForm.confirmNewPassword" class="ui-control" type="password" minlength="8" required autocomplete="new-password">
              </label>
            </div>

            <button type="submit" class="ui-button ui-button-primary" w-max :disabled="passwordLoading">
              {{ passwordLoading ? $t('Working...') : $t('Save password') }}
            </button>
          </form>
        </section>
      </aside>

      <section flex="~ col gap4" min-w-0>
        <div flex items-center justify-between gap4>
          <div>
            <h2 text-2xl font-serif>
              {{ $t('Your reviews') }}
            </h2>
            <p mt1 text-sm op60>
              {{ $t('{numberOfReviews} Reviews', { numberOfReviews: reviewsData?.reviews.length || 0 }) }}
            </p>
          </div>
          <NuxtLink v-if="isAdmin" to="/admin" n-link-text>
            {{ $t('Admin dashboard') }}
          </NuxtLink>
        </div>
        <div v-if="reviewError" border="~ red/40" bg-red:10 p4 text-sm text-red:1>
          {{ reviewError }}
        </div>
        <div v-if="!reviewsData?.reviews.length" border="~ base" bg-white:5 p6 op70>
          {{ $t('No reviews yet.') }}
        </div>
        <div v-else flex="~ col gap4">
          <article
            v-for="review in reviewsData.reviews"
            :key="review.id"
            border="~ base"
            bg-white:5
            p4
            md:p5
            grid="~ cols-1 md:cols-[5.5rem_minmax(0,1fr)] gap4"
          >
            <NuxtLink
              :to="`/${review.tmdbMediaType}/${review.tmdbMediaId}`"
              n-link
              block
              class="aspect-10/16"
              bg-white:5
              overflow-hidden
            >
              <NuxtImg
                v-if="review.tmdbPosterPathSnapshot"
                :src="`/tmdb${review.tmdbPosterPathSnapshot}`"
                :alt="review.tmdbTitleSnapshot"
                width="176"
                height="264"
                format="webp"
                w-full
                h-full
                object-cover
              />
              <div v-else h-full flex border="~ base" op30>
                <div i-ph:film-strip ma text-3xl />
              </div>
            </NuxtLink>

            <div min-w-0 flex="~ col gap4">
              <div flex="~ col lg:row gap3" lg:items-start lg:justify-between>
                <NuxtLink :to="`/${review.tmdbMediaType}/${review.tmdbMediaId}`" flex="~ col gap1" min-w-0 n-link>
                  <span text-xl font-serif leading-tight>{{ review.tmdbTitleSnapshot }}</span>
                  <span text-sm op60>{{ review.tmdbMediaType.toUpperCase() }} · {{ new Date(review.updatedAt).toLocaleDateString() }}</span>
                </NuxtLink>
                <div flex flex-wrap gap2 text-sm shrink-0>
                  <span border="~ primary/40" px2 py1 capitalize>{{ review.sentimentLabel }}</span>
                  <span border="~ base" px2 py1>{{ statusLabel(review.status) }}</span>
                </div>
              </div>

              <p leading-7 op85>
                {{ review.content }}
              </p>

              <details v-if="review.history.length" border="~ base" bg-black:20>
                <summary cursor-pointer px4 py3 text-sm font-bold focus:outline-primary>
                  {{ $t('Review history') }} ({{ review.history.length }})
                </summary>
                <div px4 pb4 flex="~ col gap3">
                  <article v-for="entry in review.history" :key="entry.id" border="t base" pt3>
                    <div flex flex-wrap items-center gap2 text-xs op75>
                      <span font-bold>{{ historyActionLabel(entry.action) }}</span>
                      <span>{{ new Date(entry.createdAt).toLocaleString() }}</span>
                      <span border="~ base" px2 py1 capitalize>{{ entry.sentimentLabel }}</span>
                      <span border="~ base" px2 py1>{{ statusLabel(entry.status) }}</span>
                    </div>
                    <p mt2 text-sm leading-6 op85>
                      {{ entry.content }}
                    </p>
                  </article>
                </div>
              </details>
              <div v-else border="~ base" bg-black:20 p3 text-sm op60>
                {{ $t('No review history yet.') }}
              </div>

              <div flex justify-end>
                <button
                  v-if="review.status === 'visible'"
                  type="button"
                  class="ui-button ui-button-danger ui-button-compact"
                  :disabled="!!busyReviewId"
                  @click="deleteReview(review.id)"
                >
                  {{ busyReviewId === review.id ? $t('Working...') : $t('Delete') }}
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  </main>
</template>
