<script setup lang="ts">
import { useAuth } from '~/composables/auth'

interface AdminUser {
  id: string
  username: string
  email: string
  role: 'admin' | 'user'
  approvalStatus: 'pending' | 'approved' | 'rejected'
  isActive: boolean
  approvedAt: string | null
  createdAt: string
  reviewCount: number
}

const { user, refreshUser, isAdmin } = useAuth()
const { t } = useI18n()

await refreshUser()

if (!user.value)
  await navigateTo('/login?redirect=/admin/users')

if (user.value && !isAdmin.value)
  throw createError({ statusCode: 403, statusMessage: 'Admin access required.' })

const filters = reactive({
  q: '',
  role: 'all',
  approvalStatus: 'all',
  activeStatus: 'all',
})
const query = computed(() => ({
  q: filters.q || undefined,
  role: filters.role,
  approvalStatus: filters.approvalStatus,
  activeStatus: filters.activeStatus,
}))
const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
const { data, pending, error, refresh } = await useFetch<{ users: AdminUser[] }>('/api/admin/users', {
  headers,
  query,
  default: () => ({ users: [] }),
})
const actionError = ref('')
const actionMessage = ref('')
const busyUserId = ref('')
const passwordDialogUser = ref<AdminUser | null>(null)
const passwordForm = reactive({
  password: '',
  confirmPassword: '',
})

function approvalLabel(status: AdminUser['approvalStatus']) {
  if (status === 'approved')
    return t('Approved')
  if (status === 'rejected')
    return t('Rejected')
  return t('Pending')
}

function activeLabel(isActive: boolean) {
  return isActive ? t('Active') : t('Disabled')
}

function getApiErrorMessage(e: any, fallback: string) {
  return e?.data?.statusMessage || e?.statusMessage || e?.data?.message || fallback
}

async function setUserActive(listedUser: AdminUser, isActive: boolean) {
  actionError.value = ''
  actionMessage.value = ''
  busyUserId.value = listedUser.id

  try {
    await $fetch(`/api/admin/users/${listedUser.id}/active` as string, {
      method: 'PATCH',
      body: { isActive },
    })
    await refresh()
    actionMessage.value = isActive ? t('User account enabled.') : t('User account disabled.')
  }
  catch (e: any) {
    actionError.value = getApiErrorMessage(e, t('Action failed. Please try again.'))
  }
  finally {
    busyUserId.value = ''
  }
}

function openPasswordDialog(listedUser: AdminUser) {
  actionError.value = ''
  actionMessage.value = ''
  passwordForm.password = ''
  passwordForm.confirmPassword = ''
  passwordDialogUser.value = listedUser
}

function closePasswordDialog() {
  passwordDialogUser.value = null
  passwordForm.password = ''
  passwordForm.confirmPassword = ''
}

async function updateUserPassword() {
  if (!passwordDialogUser.value)
    return

  actionError.value = ''
  actionMessage.value = ''
  busyUserId.value = passwordDialogUser.value.id

  try {
    await $fetch(`/api/admin/users/${passwordDialogUser.value.id}/password` as string, {
      method: 'PATCH',
      body: {
        password: passwordForm.password,
        confirmPassword: passwordForm.confirmPassword,
      },
    })
    actionMessage.value = t('Password updated.')
    closePasswordDialog()
  }
  catch (e: any) {
    actionError.value = getApiErrorMessage(e, t('Password could not be updated. Please try again.'))
  }
  finally {
    busyUserId.value = ''
  }
}

useHead({
  title: 'User list',
})
</script>

<template>
  <main min-h-full p6 md:p10 flex="~ col gap8">
    <header flex="~ col gap3">
      <NuxtLink to="/admin" n-link-text w-max>
        {{ $t('Admin dashboard') }}
      </NuxtLink>
      <h1 text-4xl font-serif>
        {{ $t('User list') }}
      </h1>
      <p op60>
        {{ $t('Review user roles, approval status, and activity.') }}
      </p>
    </header>

    <form flex="~ col lg:row gap3" lg:items-end :aria-busy="pending" @submit.prevent="() => refresh()">
      <label flex="~ col gap2" flex-1>
        <span text-sm op70>{{ $t('Search') }}</span>
        <input v-model="filters.q" type="search" class="ui-control" :placeholder="$t('Username or email')">
      </label>
      <label flex="~ col gap2">
        <span text-sm op70>{{ $t('Role') }}</span>
        <select v-model="filters.role" class="ui-control">
          <option value="all">
            {{ $t('All roles') }}
          </option>
          <option value="admin">
            {{ $t('Admin') }}
          </option>
          <option value="user">
            {{ $t('User') }}
          </option>
        </select>
      </label>
      <label flex="~ col gap2">
        <span text-sm op70>{{ $t('Approval status') }}</span>
        <select v-model="filters.approvalStatus" class="ui-control">
          <option value="all">
            {{ $t('All approval statuses') }}
          </option>
          <option value="pending">
            {{ $t('Pending') }}
          </option>
          <option value="approved">
            {{ $t('Approved') }}
          </option>
          <option value="rejected">
            {{ $t('Rejected') }}
          </option>
        </select>
      </label>
      <label flex="~ col gap2">
        <span text-sm op70>{{ $t('Account status') }}</span>
        <select v-model="filters.activeStatus" class="ui-control">
          <option value="all">
            {{ $t('All account statuses') }}
          </option>
          <option value="active">
            {{ $t('Active') }}
          </option>
          <option value="inactive">
            {{ $t('Disabled') }}
          </option>
        </select>
      </label>
      <button type="submit" class="ui-button ui-button-primary" h-max focus:outline-primary>
        {{ $t('Apply filters') }}
      </button>
    </form>

    <div v-if="actionMessage" border="~ primary/40" bg-primary:10 p4 text-sm role="status">
      {{ actionMessage }}
    </div>
    <div v-if="actionError" border="~ red/40" bg-red:10 p4 text-sm text-red:1 role="alert">
      {{ actionError }}
    </div>

    <div v-if="pending" border="~ base" bg-white:5 p5 op70>
      {{ $t('Loading...') }}
    </div>
    <div v-else-if="error" border="~ red/40" bg-red:10 p5 text-red:1 role="alert">
      {{ $t('Users could not be loaded right now.') }}
    </div>
    <div v-else-if="!data?.users.length" border="~ base" bg-white:5 p5 op70>
      {{ $t('No users match these filters.') }}
    </div>
    <div v-else border="~ base" overflow-x-auto aria-label="Users table">
      <table w-full text-left text-sm>
        <thead bg-white:8>
          <tr>
            <th p4 font-normal op70 scope="col">
              {{ $t('Username') }}
            </th>
            <th p4 font-normal op70 scope="col">
              {{ $t('Email') }}
            </th>
            <th p4 font-normal op70 scope="col">
              {{ $t('Role') }}
            </th>
            <th p4 font-normal op70 scope="col">
              {{ $t('Approval status') }}
            </th>
            <th p4 font-normal op70 scope="col">
              {{ $t('Account status') }}
            </th>
            <th p4 font-normal op70 scope="col">
              {{ $t('Reviews') }}
            </th>
            <th p4 font-normal op70 scope="col">
              {{ $t('Joined') }}
            </th>
            <th p4 font-normal op70 text-right scope="col">
              {{ $t('Actions') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="listedUser in data.users" :key="listedUser.id" border="t base">
            <td p4 font-bold>
              {{ listedUser.username }}
            </td>
            <td p4 break-all>
              {{ listedUser.email }}
            </td>
            <td p4 capitalize>
              {{ listedUser.role }}
            </td>
            <td p4>
              <span border="~ base" px2 py1>{{ approvalLabel(listedUser.approvalStatus) }}</span>
            </td>
            <td p4>
              <span border="~ base" px2 py1 :class="listedUser.isActive ? 'text-primary' : 'text-red:1'">
                {{ activeLabel(listedUser.isActive) }}
              </span>
            </td>
            <td p4>
              {{ listedUser.reviewCount }}
            </td>
            <td p4>
              {{ new Date(listedUser.createdAt).toLocaleDateString() }}
            </td>
            <td p4>
              <div flex justify-end gap2>
                <button
                  type="button"
                  class="ui-button ui-button-compact"
                  :disabled="busyUserId === listedUser.id || listedUser.role !== 'user'"
                  @click="openPasswordDialog(listedUser)"
                >
                  {{ $t('Change password') }}
                </button>
                <button
                  v-if="listedUser.isActive"
                  type="button"
                  class="ui-button ui-button-danger ui-button-compact"
                  :disabled="busyUserId === listedUser.id || listedUser.role !== 'user'"
                  @click="setUserActive(listedUser, false)"
                >
                  {{ busyUserId === listedUser.id ? $t('Working...') : $t('Disable') }}
                </button>
                <button
                  v-else
                  type="button"
                  class="ui-button ui-button-primary ui-button-compact"
                  :disabled="busyUserId === listedUser.id || listedUser.role !== 'user'"
                  @click="setUserActive(listedUser, true)"
                >
                  {{ busyUserId === listedUser.id ? $t('Working...') : $t('Enable') }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="passwordDialogUser" fixed inset-0 z-50 grid place-items-center bg-black:80 p4 @click.self="closePasswordDialog">
      <form border="~ base" bg="#151515" p6 w-full max-w-md flex="~ col gap4" @submit.prevent="updateUserPassword">
        <div flex items-start justify-between gap4>
          <div>
            <h2 text-2xl font-serif>
              {{ $t('Change password') }}
            </h2>
            <p mt1 text-sm op60>
              {{ passwordDialogUser.username }}
            </p>
          </div>
          <button type="button" class="ui-button ui-button-compact" @click="closePasswordDialog">
            {{ $t('Close') }}
          </button>
        </div>

        <label flex="~ col gap2">
          <span text-sm op70>{{ $t('New password') }}</span>
          <input v-model="passwordForm.password" class="ui-control" type="password" minlength="8" required autocomplete="new-password">
        </label>
        <label flex="~ col gap2">
          <span text-sm op70>{{ $t('Confirm new password') }}</span>
          <input v-model="passwordForm.confirmPassword" class="ui-control" type="password" minlength="8" required autocomplete="new-password">
        </label>

        <button type="submit" class="ui-button ui-button-primary" :disabled="busyUserId === passwordDialogUser.id">
          {{ busyUserId === passwordDialogUser.id ? $t('Working...') : $t('Save password') }}
        </button>
      </form>
    </div>
  </main>
</template>
