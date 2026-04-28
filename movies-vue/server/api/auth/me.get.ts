import { getCurrentUser } from '../../utils/auth'
import { deleteCurrentSession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)

  if (user && !user.isActive) {
    await deleteCurrentSession(event)
    return { user: null }
  }

  return {
    user: user
      ? {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          approvalStatus: user.approvalStatus,
          isActive: user.isActive,
          createdAt: user.createdAt.toISOString(),
        }
      : null,
  }
})
