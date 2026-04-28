import { z } from 'zod'
import { hashPassword } from '../../utils/password'
import { prisma } from '../../utils/prisma'
import { assertRateLimit, assertValidOrigin, getClientIp } from '../../utils/security'

const registerSchema = z.object({
  username: z.string().trim().min(3).max(32).regex(/^[\w.-]+$/),
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  password: z.string().min(8).max(200),
  confirmPassword: z.string().min(8).max(200),
}).refine(data => data.password === data.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match.',
})

export default defineEventHandler(async (event) => {
  assertValidOrigin(event)
  assertRateLimit({
    key: `register:${getClientIp(event)}`,
    limit: 3,
    windowMs: 60 * 60 * 1000,
  })

  const body = await readBody(event)
  const parsed = registerSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Invalid registration details.',
    })
  }

  const { username, email, password } = parsed.data

  const existingUsername = await prisma.user.findUnique({ where: { username } })
  if (existingUsername) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Username is already registered.',
    })
  }

  const existingEmail = await prisma.user.findUnique({ where: { email } })
  if (existingEmail) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Email is already registered.',
    })
  }

  await prisma.user.create({
    data: {
      username,
      email,
      passwordHash: await hashPassword(password),
      role: 'user',
      approvalStatus: 'pending',
    },
  })

  setResponseStatus(event, 201)
  return {
    message: 'Registration received. Your account is waiting for admin approval before you can write reviews.',
  }
})
