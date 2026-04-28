<script setup lang="ts">
import { useAuth } from '~/composables/auth'
import '@unocss/reset/tailwind.css'

const { user, refreshUser } = useAuth()

await refreshUser()

const showNavBar = computed(() => !!user.value)

useHead({
  htmlAttrs: {
    lang: 'en',
  },
  title: 'Nuxt Movies',
  titleTemplate: title => (title !== 'Nuxt Movies' ? `${title} · Nuxt Movies` : title),
  meta: [
    { charset: 'utf-8' },
    { name: 'description', content: 'A TMDB client built with Nuxt Image to show the potential of it ✨' },
    { property: 'og:image', content: 'https://movies.nuxt.space/social-card.png' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:site', content: '@nuxt_js' },
    { name: 'twitter:creator', content: '@nuxt_js' },
  ],
  link: [
    {
      rel: 'icon',
      type: 'image/webp',
      href: '/movies.webp',
    },
  ],
})
</script>

<template>
  <NuxtLoadingIndicator />
  <div
    h-full
    w-full
    font-sans
    of-hidden
    view-transition-app
    transition
    duration-0
    :class="showNavBar ? 'grid lt-lg:grid-rows-[1fr_max-content] lg:grid-cols-[max-content_1fr]' : 'block'"
  >
    <div id="app-scroller" of-x-hidden of-y-auto relative>
      <NuxtPage />
    </div>
    <NavBar v-if="showNavBar" lg:order-first />
    <IframeModal />
    <PhotoModal />
  </div>
</template>

<style>
html,
body,
#__nuxt {
  height: 100vh;
  margin: 0;
  padding: 0;
  background: #111;
  color: white;
  color-scheme: dark;
}

button,
input,
select,
textarea {
  color: inherit;
  font: inherit;
}

input::placeholder,
textarea::placeholder {
  color: rgb(214 225 222 / 48%);
  opacity: 1;
}

select option {
  background: #0b0f10;
  color: #f5f8f7;
}

.ui-control,
.admin-control {
  min-height: 44px;
  border: 1px solid rgb(255 255 255 / 16%);
  background: rgb(0 0 0 / 72%);
  color: rgb(245 248 247);
  padding: 10px 12px;
  outline: none;
}

.ui-control:focus,
.admin-control:focus {
  border-color: rgb(42 198 178);
  box-shadow: 0 0 0 3px rgb(42 198 178 / 16%);
}

.ui-button,
.admin-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  border: 1px solid rgb(255 255 255 / 16%);
  padding: 8px 14px;
  background: rgb(255 255 255 / 8%);
  color: rgb(245 248 247);
  font-weight: 700;
  line-height: 1.25;
  text-align: center;
  text-decoration: none;
  cursor: pointer;
  transition: transform 160ms ease, filter 160ms ease, opacity 160ms ease, background-color 160ms ease;
}

.ui-button:hover:not(:disabled),
.ui-button:focus-visible,
.admin-button:hover:not(:disabled),
.admin-button:focus-visible {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.ui-button:disabled,
.admin-button:disabled {
  cursor: not-allowed;
  opacity: 0.68;
}

.ui-button-primary,
.admin-button-primary {
  border-color: rgb(42 198 178 / 72%);
  background: rgb(42 198 178);
  color: rgb(2 8 8);
}

.ui-button-danger,
.admin-button-danger {
  border-color: rgb(248 113 113 / 72%);
  background: rgb(185 28 28);
  color: rgb(255 245 245);
}

.ui-button-compact {
  min-height: 36px;
  padding: 6px 10px;
  font-size: 0.875rem;
}

.auth-route-enter-active,
.auth-route-leave-active {
  transition:
    opacity 220ms ease,
    transform 260ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 260ms ease;
}

.auth-route-enter-from {
  opacity: 0;
  filter: blur(8px);
  transform: translateY(14px) scale(0.985);
}

.auth-route-leave-to {
  opacity: 0;
  filter: blur(4px);
  transform: translateY(-10px) scale(0.99);
}

@media (prefers-reduced-motion: reduce) {
  .auth-route-enter-active,
  .auth-route-leave-active {
    transition: none;
  }
}
</style>
