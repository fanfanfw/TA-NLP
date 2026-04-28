<script setup lang="ts">
import { useAuth } from '~/composables/auth'

const { user, refreshUser, register } = useAuth()
const { t } = useI18n()

definePageMeta({
  pageTransition: {
    name: 'auth-route',
    mode: 'out-in',
  },
})

await refreshUser()

if (user.value)
  await navigateTo('/')

const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const toastMessage = computed(() => error.value)

function getApiErrorMessage(e: any) {
  return e?.data?.statusMessage || e?.statusMessage || e?.data?.message || t('Registration failed. Please check your details.')
}

async function submit() {
  error.value = ''

  if (password.value !== confirmPassword.value) {
    error.value = t('Passwords do not match.')
    return
  }

  loading.value = true

  try {
    await register({
      username: username.value,
      email: email.value,
      password: password.value,
      confirmPassword: confirmPassword.value,
    })
    await navigateTo('/login?status=pending&registered=1')
  }
  catch (e: any) {
    error.value = getApiErrorMessage(e)
  }
  finally {
    loading.value = false
  }
}

useHead({
  title: 'Register',
})
</script>

<template>
  <main class="auth-page auth-page-register">
    <div class="auth-stage" aria-hidden="true">
      <div class="spotlight" />
    </div>

    <div v-if="toastMessage" class="auth-toast auth-toast-error" role="alert" aria-live="polite">
      <div i-ph-warning-circle class="notice-icon" aria-hidden="true" />
      <p>{{ toastMessage }}</p>
    </div>

    <section class="auth-card" aria-labelledby="register-title">
      <div class="brand-mark" aria-hidden="true">
        M
      </div>
      <div class="auth-copy">
        <p class="eyebrow">
          Nuxt Movies
        </p>
        <h1 id="register-title">
          {{ $t('Register') }}
        </h1>
        <p>
          {{ $t('Create an account. An admin must approve it before review access is enabled.') }}
        </p>
      </div>

      <form class="auth-form" :aria-busy="loading" @submit.prevent="submit">
        <div class="notice-stack" aria-live="polite">
          <div v-if="error" class="notice notice-error" role="alert">
            <div i-ph-warning-circle class="notice-icon" aria-hidden="true" />
            <p>{{ error }}</p>
          </div>
        </div>

        <label class="field">
          <span>{{ $t('Username') }}</span>
          <input v-model="username" required type="text" minlength="3" maxlength="32" autocomplete="username">
        </label>

        <label class="field">
          <span>{{ $t('Email') }}</span>
          <input v-model="email" required type="email" autocomplete="email">
        </label>

        <label class="field">
          <span>{{ $t('Password') }}</span>
          <input v-model="password" required type="password" minlength="8" autocomplete="new-password">
        </label>

        <label class="field">
          <span>{{ $t('Confirm password') }}</span>
          <input v-model="confirmPassword" required type="password" minlength="8" autocomplete="new-password">
        </label>

        <button type="submit" class="auth-button" :disabled="loading">
          <span>{{ loading ? $t('Creating account...') : $t('Register') }}</span>
        </button>
      </form>

      <p class="auth-switch">
        {{ $t('Already have an account?') }}
        <NuxtLink to="/login">
          {{ $t('Login') }}
        </NuxtLink>
      </p>
    </section>
  </main>
</template>

<style scoped>
.auth-page {
  position: relative;
  min-height: 100vh;
  display: grid;
  place-items: center;
  overflow: hidden;
  padding: 24px;
  background:
    linear-gradient(135deg, rgb(8 11 12), rgb(13 16 18) 46%, rgb(5 7 8)),
    #0b0f10;
  color: rgb(245 248 247);
}

.auth-stage {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.auth-stage::before,
.auth-stage::after {
  content: "";
  position: absolute;
  inset: 0;
}

.auth-stage::before {
  opacity: 0.22;
  background:
    linear-gradient(90deg, transparent, rgb(255 255 255 / 8%) 50%, transparent),
    repeating-linear-gradient(90deg, transparent 0 88px, rgb(255 255 255 / 5%) 89px 90px, transparent 91px 178px);
  mask-image: linear-gradient(to bottom, transparent, black 22%, black 78%, transparent);
}

.auth-stage::after {
  opacity: 0.12;
  background: repeating-linear-gradient(0deg, transparent 0 8px, rgb(255 255 255 / 14%) 9px 10px);
}

.spotlight {
  position: absolute;
  inset: -20% 8% auto auto;
  width: 54vw;
  height: 72vh;
  background: radial-gradient(ellipse at center, rgb(42 198 178 / 16%), transparent 62%);
  transform: rotate(-14deg);
  animation: spotlight-drift 9s ease-in-out infinite alternate;
}

.auth-card {
  position: relative;
  z-index: 1;
  width: min(100%, 460px);
  display: grid;
  gap: 22px;
  padding: 32px;
  border: 1px solid rgb(255 255 255 / 12%);
  background: rgb(12 15 16 / 86%);
  box-shadow: 0 28px 90px rgb(0 0 0 / 45%);
  backdrop-filter: blur(18px);
  animation: auth-enter 520ms cubic-bezier(0.22, 1, 0.36, 1);
}

.auth-toast {
  position: fixed;
  z-index: 20;
  top: 20px;
  right: 20px;
  width: min(calc(100vw - 32px), 420px);
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  border: 1px solid rgb(255 255 255 / 14%);
  padding: 14px 16px;
  background: rgb(10 13 14 / 94%);
  color: rgb(245 248 247);
  box-shadow: 0 22px 70px rgb(0 0 0 / 45%);
  backdrop-filter: blur(18px);
  animation: toast-enter 260ms cubic-bezier(0.22, 1, 0.36, 1);
}

.auth-toast p {
  margin: 0;
  line-height: 1.5;
  font-size: 14px;
}

.auth-toast-error {
  border-color: rgb(248 113 113 / 46%);
  background: linear-gradient(135deg, rgb(54 19 22 / 95%), rgb(12 12 13 / 94%));
}

.brand-mark {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  background: rgb(42 198 178);
  color: rgb(2 8 8);
  font-weight: 900;
  font-size: 24px;
  clip-path: polygon(0 100%, 20% 0, 50% 44%, 80% 0, 100% 100%, 72% 100%, 50% 58%, 28% 100%);
}

.auth-copy {
  display: grid;
  gap: 8px;
}

.eyebrow {
  margin: 0;
  color: rgb(42 198 178);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.auth-copy h1 {
  margin: 0;
  font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
  font-size: 40px;
  line-height: 1;
}

.auth-copy p:not(.eyebrow),
.auth-switch {
  margin: 0;
  color: rgb(214 225 222 / 70%);
  line-height: 1.6;
}

.auth-form {
  display: grid;
  gap: 14px;
}

.notice-stack {
  display: grid;
  gap: 10px;
}

.field {
  display: grid;
  gap: 8px;
}

.field span {
  color: rgb(214 225 222 / 72%);
  font-size: 14px;
}

.field input {
  min-height: 48px;
  width: 100%;
  border: 1px solid rgb(255 255 255 / 13%);
  background: rgb(0 0 0 / 34%);
  color: rgb(245 248 247);
  padding: 0 14px;
  outline: none;
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
}

.field input:focus {
  border-color: rgb(42 198 178);
  box-shadow: 0 0 0 3px rgb(42 198 178 / 15%);
  transform: translateY(-1px);
}

.auth-button {
  min-height: 48px;
  border: 0;
  background: rgb(42 198 178);
  color: rgb(2 8 8);
  font-weight: 800;
  cursor: pointer;
  transition: transform 180ms ease, filter 180ms ease, opacity 180ms ease;
}

.auth-button:hover:not(:disabled),
.auth-button:focus-visible {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.auth-button:active:not(:disabled) {
  transform: translateY(0) scale(0.99);
}

.auth-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.notice {
  border: 1px solid rgb(255 255 255 / 12%);
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  padding: 12px 14px;
  font-size: 14px;
  line-height: 1.5;
  box-shadow: 0 14px 42px rgb(0 0 0 / 22%);
  animation: notice-enter 240ms ease-out;
}

.notice p {
  margin: 0;
}

.notice-icon {
  margin-top: 2px;
  font-size: 18px;
}

.notice-error {
  border-color: rgb(248 113 113 / 38%);
  background: rgb(127 29 29 / 24%);
  color: rgb(254 202 202);
}

.auth-switch a {
  color: rgb(42 198 178);
  font-weight: 700;
  text-decoration: none;
}

.auth-switch a:hover,
.auth-switch a:focus-visible {
  text-decoration: underline;
}

@keyframes auth-enter {
  from {
    opacity: 0;
    transform: translateY(18px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes spotlight-drift {
  from { opacity: 0.6; transform: rotate(-14deg) translate3d(0, 0, 0); }
  to { opacity: 1; transform: rotate(-10deg) translate3d(-24px, 18px, 0); }
}

@keyframes notice-enter {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes toast-enter {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 560px) {
  .auth-page {
    padding: 16px;
  }

  .auth-card {
    padding: 24px;
  }

  .auth-copy h1 {
    font-size: 34px;
  }

  .auth-toast {
    top: 14px;
    right: 16px;
    left: 16px;
    width: auto;
  }

}

@media (prefers-reduced-motion: reduce) {
  .auth-card,
  .spotlight,
  .notice,
  .auth-toast {
    animation: none;
  }

  .field input,
  .auth-button {
    transition: none;
  }
}
</style>
