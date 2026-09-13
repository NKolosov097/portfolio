import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { sql } from 'drizzle-orm'
import { Client } from 'pg'

for (const file of ['.env.local', '.env']) {
  const path = resolve(file)
  if (existsSync(path)) process.loadEnvFile(path)
}

const connectionString =
  process.env.CONTACT_DB_DATABASE_URL_UNPOOLED?.trim() ||
  process.env.CONTACT_DB_DATABASE_URL?.trim() ||
  process.env.DIRECT_DATABASE_URL?.trim() ||
  process.env.DATABASE_URL_UNPOOLED?.trim() ||
  process.env.DATABASE_URL?.trim()

if (!connectionString || connectionString.startsWith('prisma://')) {
  throw new Error('A direct PostgreSQL migration URL is required')
}

const main = async () => {
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 10_000,
    statement_timeout: 120_000,
    application_name: 'portfolio-contact-migrations',
  })
  client.on('error', () => {})

  await client.connect()
  try {
    const database = drizzle(client)
    await database.transaction(async (transaction) => {
      await transaction.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext('portfolio-contact-migrations-v2'))`,
      )
      await migrate(transaction, { migrationsFolder: resolve('drizzle') })
    })
    console.info('Committed contact database migrations applied')
  } finally {
    await client.end()
  }
}

void main().catch((error: unknown) => {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String(error.code).replace(/[^A-Z0-9_-]/gi, '').slice(0, 32)
      : 'unknown'
  console.error(JSON.stringify({ event: 'contact_database_migration', status: 'failed', code }))
  process.exitCode = 1
})
