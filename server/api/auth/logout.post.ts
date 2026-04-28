import { assertValidOrigin } from '../../utils/security'
import { deleteCurrentSession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  assertValidOrigin(event)
  await deleteCurrentSession(event)

  return { ok: true }
})
