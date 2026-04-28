import process from 'node:process'
import { PrismaClient } from '@prisma/client'

function buildDatabaseUrl() {
  if (process.env.DATABASE_URL)
    return process.env.DATABASE_URL

  const host = process.env.DB_HOST
  const port = process.env.DB_PORT || '5432'
  const user = process.env.DB_USER
  const password = process.env.DB_PASSWORD
  const database = process.env.DB_NAME

  if (!host || !user || password == null || !database)
    return undefined

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`
}

const databaseUrl = buildDatabaseUrl()
if (databaseUrl)
  process.env.DATABASE_URL = databaseUrl

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
})

if (process.env.NODE_ENV !== 'production')
  globalForPrisma.prisma = prisma
