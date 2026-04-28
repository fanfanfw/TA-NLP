<script setup lang="ts">
import { useAuth } from '~/composables/auth'

const { user, isAdmin, refreshUser, logout } = useAuth()
const route = useRoute()

await refreshUser()

function isActiveLink(to: string, isRouterActive: boolean) {
  const path = route.path.replace(/\/+$/, '') || '/'

  if (to === '/')
    return path === '/'

  if (to === '/admin')
    return path === '/admin'

  return isRouterActive || path === to || path.startsWith(`${to}/`)
}

async function handleLogout() {
  await logout()
  await navigateTo('/login')
}
</script>

<template>
  <div
    v-if="user"
    flex="~ row lg:col"
    justify-evenly items-center
    py5 lg:px5
    border="t lg:r base"
    bg-black
  >
    <template v-if="isAdmin">
      <NuxtLink v-slot="{ isActive }" to="/admin" :title="$t('Admin dashboard')" :aria-label="$t('Admin dashboard')">
        <div
          text-2xl
          :class="isActiveLink('/admin', isActive) ? 'i-ph-squares-four-fill text-primary' : 'i-ph-squares-four'"
        />
        <span sr-only>{{ $t('Admin dashboard') }}</span>
      </NuxtLink>
      <NuxtLink v-slot="{ isActive }" to="/admin/users" :title="$t('User management')" :aria-label="$t('User management')">
        <div
          text-2xl
          :class="isActiveLink('/admin/users', isActive) ? 'i-ph-users-three-fill text-primary' : 'i-ph-users-three'"
        />
        <span sr-only>{{ $t('User management') }}</span>
      </NuxtLink>
      <NuxtLink v-slot="{ isActive }" to="/admin/reviews" :title="$t('Review management')" :aria-label="$t('Review management')">
        <div
          text-2xl
          :class="isActiveLink('/admin/reviews', isActive) ? 'i-ph-chat-centered-text-fill text-primary' : 'i-ph-chat-centered-text'"
        />
        <span sr-only>{{ $t('Review management') }}</span>
      </NuxtLink>
    </template>
    <template v-else>
      <NuxtLink v-slot="{ isActive }" to="/" :title="$t('Home')" :aria-label="$t('Home')">
        <div
          text-2xl
          :class="isActiveLink('/', isActive) ? 'i-ph-house-fill text-primary' : 'i-ph-house'"
        />
        <span sr-only>{{ $t('Home') }}</span>
      </NuxtLink>
      <NuxtLink v-slot="{ isActive }" to="/movie" :title="$t('Movies')" :aria-label="$t('Movies')">
        <div
          text-2xl
          :class="isActiveLink('/movie', isActive) ? 'i-ph-film-strip-fill text-primary' : 'i-ph-film-strip'"
        />
        <span sr-only>{{ $t('Movies') }}</span>
      </NuxtLink>
      <NuxtLink v-slot="{ isActive }" to="/tv" :title="$t('TV Shows')" :aria-label="$t('TV Shows')">
        <div
          text-2xl
          :class="isActiveLink('/tv', isActive) ? 'i-ph-television-simple-fill text-primary' : 'i-ph-television-simple'"
        />
        <span sr-only>{{ $t('TV Shows') }}</span>
      </NuxtLink>
      <NuxtLink v-slot="{ isActive }" to="/search" :title="$t('Search')" :aria-label="$t('Search')">
        <div
          text-2xl
          :class="isActiveLink('/search', isActive) ? 'i-ph-magnifying-glass-fill text-primary' : 'i-ph-magnifying-glass'"
        />
        <span sr-only>{{ $t('Search') }}</span>
      </NuxtLink>
      <NuxtLink v-slot="{ isActive }" to="/profile" :title="$t('Profile')" :aria-label="$t('Profile')">
        <div
          text-2xl
          :class="isActiveLink('/profile', isActive) ? 'i-ph-user-circle-fill text-primary' : 'i-ph-user-circle'"
        />
        <span sr-only>{{ $t('Profile') }}</span>
      </NuxtLink>
    </template>
    <button type="button" :title="$t('Logout')" :aria-label="$t('Logout')" n-link @click="handleLogout">
      <div i-ph-sign-out text-2xl />
      <span sr-only>{{ $t('Logout') }}</span>
    </button>
  </div>
</template>
