<script setup lang="ts">
import { useAuth } from '~/composables/auth'

interface ApprovalUser {
  id: string
  username: string
  email: string
  createdAt: string
}

const { user, refreshUser, isAdmin } = useAuth()
const { t } = useI18n()

await refreshUser()

if (!user.value)
  await navigateTo('/login?redirect=/admin/approvals')

if (user.value && !isAdmin.value)
  throw createError({ statusCode: 403, statusMessage: 'Admin access required.' })

const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
const { data, pending, refresh } = await useFetch<{ users: ApprovalUser[] }>('/api/admin/approvals', { headers })
const actionError = ref('')
const busyUserId = ref('')

async function moderate(userId: string, action: 'approve' | 'reject') {
  actionError.value = ''
  busyUserId.value = userId

  try {
    await $fetch(`/api/admin/approvals/${userId}/${action}`, {
      method: 'POST',
    })
    await refresh()
  }
  catch (e: any) {
    actionError.value = e?.statusMessage || e?.data?.message || t('Action failed. Please try again.')
  }
  finally {
    busyUserId.value = ''
  }
}

useHead({
  title: 'Approval queue',
})
</script>

<template>
  <main min-h-full p6 md:p10 flex="~ col gap8">
    <header flex="~ col gap3">
      <NuxtLink to="/admin" n-link-text w-max>
        {{ $t('Admin dashboard') }}
      </NuxtLink>
      <h1 text-4xl font-serif>
        {{ $t('Approval queue') }}
      </h1>
      <p op60>
        {{ $t('Approve or reject newly registered users.') }}
      </p>
    </header>

    <div v-if="actionError" border="~ red/40" bg-red:10 p4 text-sm text-red:1>
      {{ actionError }}
    </div>

    <div v-if="pending" border="~ base" bg-white:5 p5 op70>
      {{ $t('Loading...') }}
    </div>

    <div v-else-if="!data?.users.length" border="~ base" bg-white:5 p5 op70>
      {{ $t('No pending users.') }}
    </div>

    <div v-else border="~ base" overflow-x-auto>
      <table w-full text-left text-sm>
        <thead bg-white:8>
          <tr>
            <th p4 font-normal op70>
              {{ $t('Username') }}
            </th>
            <th p4 font-normal op70>
              {{ $t('Email') }}
            </th>
            <th p4 font-normal op70>
              {{ $t('Registered') }}
            </th>
            <th p4 font-normal op70 text-right>
              {{ $t('Actions') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="pendingUser in data.users" :key="pendingUser.id" border="t base">
            <td p4>
              {{ pendingUser.username }}
            </td>
            <td p4 break-all>
              {{ pendingUser.email }}
            </td>
            <td p4>
              {{ new Date(pendingUser.createdAt).toLocaleDateString() }}
            </td>
            <td p4>
              <div flex justify-end gap2>
                <button type="button" class="ui-button ui-button-primary ui-button-compact" :disabled="!!busyUserId" @click="moderate(pendingUser.id, 'approve')">
                  {{ busyUserId === pendingUser.id ? $t('Working...') : $t('Approve') }}
                </button>
                <button type="button" class="ui-button ui-button-danger ui-button-compact" :disabled="!!busyUserId" @click="moderate(pendingUser.id, 'reject')">
                  {{ $t('Reject') }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</template>
