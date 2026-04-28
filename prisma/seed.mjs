/* eslint-disable no-console */
import process from 'node:process'
import { PrismaClient } from '@prisma/client'
import { argon2id, hash } from 'argon2'

const prisma = new PrismaClient()

function readArg(name) {
  const prefix = `--${name}=`
  const inline = process.argv.find(arg => arg.startsWith(prefix))
  if (inline)
    return inline.slice(prefix.length).trim()

  const index = process.argv.indexOf(`--${name}`)
  if (index >= 0)
    return process.argv[index + 1]?.trim()

  return ''
}

function requireArg(name) {
  const value = readArg(name)
  if (!value) {
    throw new Error(`Missing required argument --${name}`)
  }
  return value
}

async function main() {
  const username = requireArg('username')
  const email = requireArg('email').toLowerCase()
  const password = requireArg('password')

  if (password.length < 8)
    throw new Error('Admin password must be at least 8 characters long.')

  const conflict = await prisma.user.findFirst({
    where: {
      OR: [
        { username },
        { email },
      ],
    },
  })

  if (conflict && (conflict.username !== username || conflict.email !== email)) {
    throw new Error('Username or email is already used by a different account.')
  }

  const passwordHash = await hash(password, { type: argon2id })
  const approvedAt = new Date()

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      username,
      passwordHash,
      role: 'admin',
      approvalStatus: 'approved',
      approvedAt,
      approvedById: null,
    },
    create: {
      username,
      email,
      passwordHash,
      role: 'admin',
      approvalStatus: 'approved',
      approvedAt,
    },
  })

  console.log(`Admin user ready: ${admin.username} <${admin.email}>`)
}

main()
  .catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
