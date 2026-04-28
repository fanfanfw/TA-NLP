export interface AuthUser {
  id: string
  username: string
  email: string
  role: 'admin' | 'user'
  approvalStatus: 'pending' | 'approved' | 'rejected'
  isActive: boolean
  createdAt: string
}

interface AuthMeResponse {
  user: AuthUser | null
}

interface RegisterPayload {
  username: string
  email: string
  password: string
  confirmPassword: string
}

interface LoginPayload {
  identifier: string
  password: string
}

export function useAuth() {
  const user = useState<AuthUser | null>('auth:user', () => null)
  const pending = useState('auth:pending', () => false)

  async function refreshUser() {
    pending.value = true
    try {
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
      const response = await $fetch<AuthMeResponse>('/api/auth/me', { headers })
      user.value = response.user
      return user.value
    }
    catch {
      user.value = null
      return null
    }
    finally {
      pending.value = false
    }
  }

  async function register(payload: RegisterPayload) {
    return await $fetch('/api/auth/register', {
      method: 'POST',
      body: payload,
    })
  }

  async function login(payload: LoginPayload) {
    const response = await $fetch<{ user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: payload,
    })
    user.value = response.user
    return response.user
  }

  async function logout() {
    await $fetch('/api/auth/logout', {
      method: 'POST',
    })
    user.value = null
  }

  return {
    user,
    pending,
    isAuthenticated: computed(() => !!user.value),
    isAdmin: computed(() => user.value?.role === 'admin'),
    refreshUser,
    register,
    login,
    logout,
  }
}
