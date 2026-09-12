import { defineConfig } from 'drizzle-kit'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

for (const file of ['.env.local', '.env']) {
  const path = resolve(file)
  if (existsSync(path)) process.loadEnvFile(path)
}

const url =
  process.env.CONTACT_DB_DATABASE_URL_UNPOOLED?.trim() ||
  process.env.CONTACT_DB_DATABASE_URL?.trim() ||
  process.env.DIRECT_DATABASE_URL?.trim() ||
  process.env.DATABASE_URL_UNPOOLED?.trim() ||
  process.env.DATABASE_URL?.trim()
if (url?.startsWith('prisma://'))
  throw new Error('DIRECT_DATABASE_URL or DATABASE_URL must be PostgreSQL')

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  ...(url ? { dbCredentials: { url } } : {}),
  strict: true,
})
