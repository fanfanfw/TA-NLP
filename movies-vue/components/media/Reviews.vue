<script setup lang="ts">
import type { Media, MediaType } from '~/types'
import { useAuth } from '~/composables/auth'

interface PublicReview {
  id: string
  user: {
    id: string
    username: string
  }
  tmdbMediaType: MediaType
  tmdbMediaId: string
  content: string
  sentimentLabel: 'positive' | 'negative' | null
  status: 'visible' | 'hidden_by_admin' | 'deleted_by_admin' | 'deleted_by_user'
  isModerationPlaceholder: boolean
  createdAt: string
  updatedAt: string
}

interface CurrentUserReview {
  id: string
  content: string
  sentimentLabel: 'positive' | 'negative'
  status: 'visible' | 'hidden_by_admin' | 'deleted_by_admin' | 'deleted_by_user'
  createdAt: string
  updatedAt: string
}

interface ReviewsResponse {
  reviews: PublicReview[]
  currentUserReview: CurrentUserReview | null
}

interface ReviewSubmitResponse {
  review: CurrentUserReview
  classification: {
    label: 'positive' | 'negative'
    is_positive: boolean
  }
}

const props = defineProps<{
  item: Media
  type: MediaType
}>()

const { user, refreshUser } = useAuth()

await refreshUser()

const { t } = useI18n()
const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
const mediaId = computed(() => props.item.id.toString())
const feedbackTimer = ref<ReturnType<typeof setTimeout> | null>(null)

const { data, pending, error, refresh } = await useFetch<ReviewsResponse>('/api/reviews', {
  headers,
  query: {
    type: props.type,
    tmdbId: mediaId.value,
  },
  default: () => ({
    reviews: [],
    currentUserReview: null,
  }),
})

const content = ref('')
const submitting = ref(false)
const deleting = ref(false)
const submitError = ref('')
const feedback = ref<{
  label: 'positive' | 'negative'
  title: string
  message: string
} | null>(null)

const currentUserReview = computed(() => data.value?.currentUserReview ?? null)
const canWriteReview = computed(() => user.value?.approvalStatus === 'approved')
const isEditMode = computed(() => !!currentUserReview.value)
const isHiddenReviewEdit = computed(() => currentUserReview.value?.status === 'hidden_by_admin')

const sortedReviews = computed(() => {
  const reviews = data.value?.reviews ?? []
  if (!user.value)
    return reviews

  return [...reviews].sort((a, b) => {
    if (a.user.id === user.value?.id)
      return -1
    if (b.user.id === user.value?.id)
      return 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
})

watch(
  currentUserReview,
  (review) => {
    content.value = review?.content ?? ''
  },
  { immediate: true },
)

function showFeedback(label: 'positive' | 'negative') {
  if (feedbackTimer.value)
    clearTimeout(feedbackTimer.value)

  feedback.value = {
    label,
    title: label === 'positive'
      ? t('Review appreciated')
      : t('Critique recorded'),
    message: label === 'positive'
      ? t('Thanks for sharing a bright take. Your review adds a helpful positive signal for this title.')
      : t('Thanks for the honest critique. Your review helps others understand a different side of this title.'),
  }

  feedbackTimer.value = setTimeout(() => {
    clearFeedback()
  }, 5700)
}

function clearFeedback() {
  if (feedbackTimer.value) {
    clearTimeout(feedbackTimer.value)
    feedbackTimer.value = null
  }

  feedback.value = null
}

async function submitReview() {
  if (submitting.value)
    return

  submitError.value = ''
  submitting.value = true

  try {
    const body = { content: content.value }
    const response = currentUserReview.value
      ? await $fetch<ReviewSubmitResponse>(`/api/reviews/${currentUserReview.value.id}`, {
        method: 'PATCH',
        body,
      })
      : await $fetch<ReviewSubmitResponse>('/api/reviews', {
        method: 'POST',
        body: {
          tmdbMediaType: props.type,
          tmdbMediaId: mediaId.value,
          content: content.value,
        },
      })

    await refresh()
    showFeedback(response.classification.label)
  }
  catch (e: any) {
    submitError.value = e?.statusMessage || e?.data?.message || t('Review could not be analyzed right now. Please try again.')
  }
  finally {
    submitting.value = false
  }
}

async function deleteReview() {
  if (!currentUserReview.value || deleting.value)
    return

  submitError.value = ''
  deleting.value = true

  try {
    await $fetch(`/api/reviews/${currentUserReview.value.id}`, {
      method: 'DELETE',
    })
    content.value = ''
    await refresh()
  }
  catch (e: any) {
    submitError.value = e?.statusMessage || e?.data?.message || t('Review could not be deleted. Please try again.')
  }
  finally {
    deleting.value = false
  }
}

onBeforeUnmount(() => {
  clearFeedback()
})
</script>

<template>
  <section max-w-300 ma p4 flex="~ col gap8">
    <Transition name="review-celebration">
      <div
        v-if="feedback"
        class="review-celebration"
        :class="feedback.label === 'positive' ? 'review-celebration-positive' : 'review-celebration-negative'"
        role="status"
        aria-live="polite"
        @click="clearFeedback"
      >
        <div class="celebration-burst celebration-burst-one" />
        <div class="celebration-burst celebration-burst-two" />
        <div class="celebration-burst celebration-burst-three" />
        <div class="celebration-card">
          <div class="celebration-icon-wrap" aria-hidden="true">
            <div
              v-if="feedback.label === 'positive'"
              class="celebration-icon"
              i-ph-heart-fill
            />
            <div
              v-else
              class="celebration-icon"
              i-ph-heart-break-fill
            />
          </div>
          <h3>{{ feedback.title }}</h3>
          <p>{{ feedback.message }}</p>
        </div>
        <div class="celebration-particles" aria-hidden="true">
          <span v-for="n in 18" :key="n" />
        </div>
      </div>
    </Transition>

    <div
      border="~ base"
      bg-white:5
      p5
      relative
      overflow-hidden
      :aria-busy="submitting"
      class="review-panel"
      :class="{
        'review-panel-positive': feedback?.label === 'positive',
        'review-panel-negative': feedback?.label === 'negative',
        'review-panel-loading': submitting,
      }"
    >
      <div flex="~ col md:row gap5" md:items-start>
        <div flex-1>
          <h2 text-2xl font-serif>
            {{ $t('Audience reviews') }}
          </h2>
          <p mt2 op60>
            {{ $t('Share one thoughtful review in English so the sentiment model can analyze it accurately.') }}
          </p>
        </div>

        <NuxtLink v-if="!user" to="/login" class="ui-button ui-button-primary" h-max flex items-center focus:outline-primary>
          {{ $t('Log in to write a review.') }}
        </NuxtLink>
      </div>

      <form v-if="canWriteReview" mt6 flex="~ col gap4" :aria-busy="submitting || deleting" @submit.prevent="submitReview">
        <div v-if="isHiddenReviewEdit" border="~ yellow/40" bg-yellow:10 p4 text-sm text-yellow role="status">
          {{ $t('Your review was hidden by an administrator. Update it and submit again to make it visible.') }}
        </div>

        <label flex="~ col gap2">
          <span text-sm op70>{{ isEditMode ? $t('Edit your review') : $t('Write a review') }}</span>
          <textarea
            v-model="content"
            minlength="10"
            maxlength="2000"
            required
            rows="6"
            :disabled="submitting || deleting"
            class="ui-control review-textarea"
            outline-none
            resize-y
            focus:border-primary
            :placeholder="$t('Write at least 10 characters in English.')"
          />
        </label>

        <div flex="~ col md:row gap3" md:items-center md:justify-between>
          <p text-sm op50>
            {{ content.length }}/2000
          </p>
          <div flex="~ col sm:row gap3" w-full md:w-auto>
            <button
              v-if="isEditMode"
              type="button"
              class="ui-button ui-button-danger"
              :disabled="submitting || deleting"
              focus:outline-primary
              @click="deleteReview"
            >
              {{ deleting ? $t('Deleting...') : $t('Delete') }}
            </button>
            <button type="submit" class="ui-button ui-button-primary" :disabled="submitting || deleting" focus:outline-primary>
              {{ submitting ? $t('Analyzing...') : isEditMode ? $t('Update review') : $t('Submit review') }}
            </button>
          </div>
        </div>

        <div v-if="submitError" border="~ red/40" bg-red:10 p4 text-sm text-red:1 role="alert">
          {{ submitError }}
        </div>
      </form>

      <div v-else-if="user" mt6 border="~ primary/30" bg-primary:10 p4 op90>
        {{ $t('Your account must be approved before you can write reviews.') }}
      </div>

      <div v-if="feedback" mt5 aria-live="polite" role="status" border="~ base" p4 :class="feedback.label === 'positive' ? 'bg-primary:10' : 'bg-blue:10'">
        {{ feedback.message }}
      </div>
    </div>

    <div flex="~ col gap4">
      <div flex items-center justify-between gap4>
        <h2 text-2xl font-serif>
          {{ $t('Reviews') }}
        </h2>
        <button type="button" class="ui-button ui-button-compact" focus:outline-primary @click="() => refresh()">
          {{ $t('Refresh') }}
        </button>
      </div>

      <div v-if="pending" border="~ base" bg-white:5 p5 op70>
        {{ $t('Loading reviews...') }}
      </div>
      <div v-else-if="error" border="~ red/40" bg-red:10 p5 text-red:1 role="alert">
        {{ $t('Reviews could not be loaded right now.') }}
      </div>
      <div v-else-if="!sortedReviews.length" border="~ base" bg-white:5 p5 op70>
        {{ user ? $t('No reviews yet. Be the first to write one.') : $t('Log in to write the first review.') }}
      </div>
      <article
        v-for="review in sortedReviews"
        v-else
        :key="review.id"
        border="~ base"
        bg-white:5
        p5
        flex="~ col gap3"
        :class="{ op75: review.isModerationPlaceholder }"
      >
        <div flex="~ col md:row gap3" md:items-center md:justify-between>
          <div>
            <div font-bold>
              {{ review.user.username }}
            </div>
            <div text-sm op55>
              {{ new Date(review.createdAt).toLocaleDateString() }}
            </div>
          </div>
          <span v-if="review.sentimentLabel" border="~ primary/40" px3 py1 text-sm capitalize w-max>
            {{ review.sentimentLabel }}
          </span>
        </div>
        <p whitespace-pre-wrap leading-7 :class="{ italic: review.isModerationPlaceholder }">
          {{ review.content }}
        </p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.review-panel::before,
.review-panel::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
}

.review-panel-positive::before {
  background: radial-gradient(circle at 80% 20%, rgb(64 193 173 / 28%), transparent 34%);
  animation: warm-review-glow 1200ms ease-out;
}

.review-panel-positive::after {
  background-image:
    radial-gradient(circle, rgb(255 255 255 / 70%) 0 1px, transparent 2px),
    radial-gradient(circle, rgb(64 193 173 / 80%) 0 1px, transparent 2px);
  background-position: 72% 42%, 82% 26%;
  background-size: 36px 36px, 52px 52px;
  animation: review-sparkle 1200ms ease-out;
}

.review-panel-negative::before {
  background: linear-gradient(115deg, transparent, rgb(65 105 180 / 18%), transparent);
  animation: cool-review-ripple 1200ms ease-out;
}

.review-panel-negative::after {
  background: repeating-linear-gradient(0deg, transparent 0 7px, rgb(255 255 255 / 5%) 8px 9px);
  animation: review-scanline 1200ms ease-out;
}

.review-panel-loading::before {
  background: linear-gradient(90deg, transparent, rgb(255 255 255 / 8%), transparent);
  animation: review-loading-scan 1100ms linear infinite;
  opacity: 1;
}

.review-textarea {
  width: 100%;
  min-height: 11rem;
  resize: vertical;
}

.review-celebration {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  overflow: hidden;
  padding: 24px;
  background:
    radial-gradient(circle at 50% 42%, var(--celebration-glow), transparent 34%),
    rgb(2 5 6 / 88%);
  color: rgb(250 252 252);
  cursor: pointer;
  backdrop-filter: blur(14px);
}

.review-celebration-positive {
  --celebration-accent: rgb(42 198 178);
  --celebration-glow: rgb(42 198 178 / 32%);
  --celebration-soft: rgb(42 198 178 / 14%);
}

.review-celebration-negative {
  --celebration-accent: rgb(248 113 113);
  --celebration-glow: rgb(248 113 113 / 28%);
  --celebration-soft: rgb(76 94 160 / 18%);
}

.celebration-card {
  position: relative;
  z-index: 2;
  width: min(100%, 520px);
  display: grid;
  justify-items: center;
  gap: 14px;
  border: 1px solid rgb(255 255 255 / 16%);
  padding: clamp(28px, 6vw, 54px);
  background: rgb(11 14 15 / 72%);
  text-align: center;
  box-shadow: 0 32px 120px rgb(0 0 0 / 55%);
  animation: celebration-card-pop 680ms cubic-bezier(0.2, 1.25, 0.24, 1) both;
}

.celebration-icon-wrap {
  display: grid;
  place-items: center;
  width: clamp(112px, 19vw, 168px);
  height: clamp(112px, 19vw, 168px);
  border: 1px solid color-mix(in srgb, var(--celebration-accent), white 24%);
  background: var(--celebration-soft);
  box-shadow:
    0 0 0 10px rgb(255 255 255 / 4%),
    0 0 80px var(--celebration-glow);
  animation: celebration-heart-pulse 920ms ease-in-out infinite alternate;
}

.celebration-icon {
  width: clamp(72px, 12vw, 112px);
  height: clamp(72px, 12vw, 112px);
  color: var(--celebration-accent);
  filter: drop-shadow(0 14px 32px rgb(0 0 0 / 45%));
}

.celebration-card h3 {
  margin: 10px 0 0;
  font-family: "DM Serif Display", ui-serif, Georgia, serif;
  font-size: clamp(2rem, 6vw, 4.4rem);
  font-weight: 700;
  line-height: 1;
}

.celebration-card p {
  margin: 0;
  max-width: 38rem;
  color: rgb(229 236 235 / 82%);
  font-size: clamp(1rem, 2.2vw, 1.2rem);
  line-height: 1.65;
}

.celebration-burst {
  position: absolute;
  width: clamp(220px, 38vw, 520px);
  aspect-ratio: 1;
  border: 1px solid var(--celebration-accent);
  opacity: 0;
  animation: celebration-ring 1800ms ease-out infinite;
}

.celebration-burst-one {
  animation-delay: 0ms;
}

.celebration-burst-two {
  animation-delay: 320ms;
}

.celebration-burst-three {
  animation-delay: 640ms;
}

.celebration-particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.celebration-particles span {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 8px;
  height: 18px;
  background: var(--celebration-accent);
  opacity: 0;
  transform-origin: center;
  animation: celebration-particle 1400ms ease-out both;
}

.celebration-particles span:nth-child(1) { --tx: -44vw; --ty: -30vh; animation-delay: 40ms; }
.celebration-particles span:nth-child(2) { --tx: -31vw; --ty: -42vh; animation-delay: 90ms; }
.celebration-particles span:nth-child(3) { --tx: -15vw; --ty: -36vh; animation-delay: 30ms; }
.celebration-particles span:nth-child(4) { --tx: 4vw; --ty: -44vh; animation-delay: 80ms; }
.celebration-particles span:nth-child(5) { --tx: 19vw; --ty: -36vh; animation-delay: 140ms; }
.celebration-particles span:nth-child(6) { --tx: 37vw; --ty: -28vh; animation-delay: 70ms; }
.celebration-particles span:nth-child(7) { --tx: 45vw; --ty: -6vh; animation-delay: 110ms; }
.celebration-particles span:nth-child(8) { --tx: 38vw; --ty: 20vh; animation-delay: 20ms; }
.celebration-particles span:nth-child(9) { --tx: 24vw; --ty: 36vh; animation-delay: 120ms; }
.celebration-particles span:nth-child(10) { --tx: 8vw; --ty: 42vh; animation-delay: 60ms; }
.celebration-particles span:nth-child(11) { --tx: -10vw; --ty: 42vh; animation-delay: 150ms; }
.celebration-particles span:nth-child(12) { --tx: -28vw; --ty: 34vh; animation-delay: 100ms; }
.celebration-particles span:nth-child(13) { --tx: -42vw; --ty: 18vh; animation-delay: 35ms; }
.celebration-particles span:nth-child(14) { --tx: -46vw; --ty: -8vh; animation-delay: 130ms; }
.celebration-particles span:nth-child(15) { --tx: -24vw; --ty: -14vh; animation-delay: 170ms; }
.celebration-particles span:nth-child(16) { --tx: 26vw; --ty: -13vh; animation-delay: 160ms; }
.celebration-particles span:nth-child(17) { --tx: 28vw; --ty: 10vh; animation-delay: 45ms; }
.celebration-particles span:nth-child(18) { --tx: -23vw; --ty: 9vh; animation-delay: 115ms; }

.review-celebration-enter-active,
.review-celebration-leave-active {
  transition: opacity 240ms ease, filter 240ms ease;
}

.review-celebration-enter-from,
.review-celebration-leave-to {
  opacity: 0;
  filter: blur(6px);
}

@keyframes warm-review-glow {
  0% { opacity: 0; transform: scale(0.95); }
  35% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(1.05); }
}

@keyframes review-sparkle {
  0% { opacity: 0; transform: translateY(8px); }
  30% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-18px); }
}

@keyframes cool-review-ripple {
  0% { opacity: 0; transform: translateX(-45%); }
  35% { opacity: 1; }
  100% { opacity: 0; transform: translateX(45%); }
}

@keyframes review-scanline {
  0% { opacity: 0; transform: translateY(-8px); }
  30% { opacity: 0.8; }
  100% { opacity: 0; transform: translateY(8px); }
}

@keyframes review-loading-scan {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes celebration-card-pop {
  0% { opacity: 0; transform: translateY(24px) scale(0.86); }
  64% { opacity: 1; transform: translateY(-4px) scale(1.03); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes celebration-heart-pulse {
  0% { transform: scale(1) rotate(-1deg); }
  100% { transform: scale(1.055) rotate(1deg); }
}

@keyframes celebration-ring {
  0% { opacity: 0.38; transform: scale(0.58) rotate(0deg); }
  100% { opacity: 0; transform: scale(1.35) rotate(16deg); }
}

@keyframes celebration-particle {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.4) rotate(0deg); }
  20% { opacity: 1; }
  100% { opacity: 0; transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1) rotate(180deg); }
}

@media (prefers-reduced-motion: reduce) {
  .review-panel::before,
  .review-panel::after,
  .celebration-card,
  .celebration-icon-wrap,
  .celebration-burst,
  .celebration-particles span {
    animation: none;
  }
}
</style>
