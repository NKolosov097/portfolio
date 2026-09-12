import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Client } from 'pg'

for (const file of ['.env.local', '.env']) {
  const path = resolve(file)
  if (existsSync(path)) process.loadEnvFile(path)
}

const connectionString =
  process.env.DIRECT_DATABASE_URL?.trim() ||
  process.env.DATABASE_URL_UNPOOLED?.trim() ||
  process.env.DATABASE_URL?.trim()

if (!connectionString || connectionString.startsWith('prisma://')) {
  throw new Error('A direct PostgreSQL migration URL is required')
}

const client = new Client({
  connectionString,
  connectionTimeoutMillis: 10_000,
  statement_timeout: 120_000,
  application_name: 'portfolio-contact-migrations',
})

await client.connect()
try {
  await client.query(`SELECT pg_advisory_lock(hashtext('portfolio-contact-migrations'))`)
  await migrate(drizzle(client), { migrationsFolder: resolve('drizzle') })
  console.info('Committed contact database migrations applied')
} finally {
  await client.query(`SELECT pg_advisory_unlock(hashtext('portfolio-contact-migrations'))`).catch(() => {})
  await client.end()
}
