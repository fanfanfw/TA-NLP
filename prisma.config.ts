import process from 'node:process'
import { defineConfig } from 'prisma/config'
import 'dotenv/config'

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
if (!databaseUrl)
  throw new Error('DATABASE_URL or DB_* environment variables are required for Prisma.')

process.env.DATABASE_URL = databaseUrl

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: databaseUrl,
  },
})
