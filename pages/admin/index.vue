<script setup lang="ts">
import { useAuth } from '~/composables/auth'

interface AdminDashboardResponse {
  counts: {
    pendingUsers: number
    approvedUsers: number
    visibleReviews: number
    moderatedReviews: number
    sentiment: {
      positive: number
      negative: number
    }
  }
}

const { user, refreshUser, isAdmin } = useAuth()

await refreshUser()

if (!user.value)
  await navigateTo('/login?redirect=/admin')

if (user.value && !isAdmin.value)
  throw createError({ statusCode: 403, statusMessage: 'Admin access required.' })

const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
const { data, pending } = await useFetch<AdminDashboardResponse>('/api/admin', {
  headers,
  default: () => ({
    counts: {
      pendingUsers: 0,
      approvedUsers: 0,
      visibleReviews: 0,
      moderatedReviews: 0,
      sentiment: {
        positive: 0,
        negative: 0,
      },
    },
  }),
})

useHead({
  title: 'Admin',
})
</script>

<template>
  <main min-h-full p6 md:p10 flex="~ col gap8">
    <header flex="~ col gap3">
      <h1 text-4xl font-serif>
        {{ $t('Admin dashboard') }}
      </h1>
      <p op60>
        {{ $t('Manage account approvals and moderation tools.') }}
      </p>
    </header>

    <section aria-label="Admin summary" grid="~ cols-1 sm:cols-2 xl:cols-5 gap3">
      <div v-if="pending" border="~ base" bg-white:5 p4 op70>
        {{ $t('Loading...') }}
      </div>
      <template v-else>
        <div border="~ base" bg-white:5 p4>
          <div text-sm op60>
            {{ $t('Pending users') }}
          </div>
          <div mt2 text-3xl font-bold>
            {{ data?.counts.pendingUsers }}
          </div>
        </div>
        <div border="~ base" bg-white:5 p4>
          <div text-sm op60>
            {{ $t('Approved users') }}
          </div>
          <div mt2 text-3xl font-bold>
            {{ data?.counts.approvedUsers }}
          </div>
        </div>
        <div border="~ base" bg-white:5 p4>
          <div text-sm op60>
            {{ $t('Visible reviews') }}
          </div>
          <div mt2 text-3xl font-bold>
            {{ data?.counts.visibleReviews }}
          </div>
        </div>
        <div border="~ base" bg-white:5 p4>
          <div text-sm op60>
            {{ $t('Moderated reviews') }}
          </div>
          <div mt2 text-3xl font-bold>
            {{ data?.counts.moderatedReviews }}
          </div>
        </div>
        <div border="~ base" bg-white:5 p4>
          <div text-sm op60>
            {{ $t('Sentiment split') }}
          </div>
          <div mt2 flex gap3 text-sm>
            <span border="~ primary/40" px2 py1>{{ $t('Positive') }}: {{ data?.counts.sentiment.positive }}</span>
            <span border="~ blue/40" px2 py1>{{ $t('Negative') }}: {{ data?.counts.sentiment.negative }}</span>
          </div>
        </div>
      </template>
    </section>

    <section grid="~ cols-1 md:cols-3 gap4">
      <NuxtLink to="/admin/approvals" border="~ base" bg-white:5 p5 hover:bg-white:10 focus:outline-primary transition>
        <div i-ph-user-check text-3xl text-primary />
        <h2 mt4 text-xl>
          {{ $t('Approval queue') }}
        </h2>
        <p mt2 op60>
          {{ $t('Approve or reject newly registered users.') }}
        </p>
      </NuxtLink>
      <NuxtLink to="/admin/reviews" border="~ base" bg-white:5 p5 hover:bg-white:10 focus:outline-primary transition>
        <div i-ph-chat-centered-text text-3xl text-primary />
        <h2 mt4 text-xl>
          {{ $t('Review moderation') }}
        </h2>
        <p mt2 op60>
          {{ $t('Hide or remove reviews and inspect model confidence.') }}
        </p>
      </NuxtLink>
      <NuxtLink to="/admin/users" border="~ base" bg-white:5 p5 hover:bg-white:10 focus:outline-primary transition>
        <div i-ph-users-three text-3xl text-primary />
        <h2 mt4 text-xl>
          {{ $t('User list') }}
        </h2>
        <p mt2 op60>
          {{ $t('Review user roles, approval status, and activity.') }}
        </p>
      </NuxtLink>
    </section>
  </main>
</template>
