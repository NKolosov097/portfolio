import 'server-only'

import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import * as schema from '@/db/schema'

const globalDatabase = globalThis as typeof globalThis & { contactPool?: Pool }

export const resolveContactDatabaseUrl = (
  environment: Readonly<Record<string, string | undefined>> = process.env,
) => environment.CONTACT_DB_DATABASE_URL?.trim() || environment.DATABASE_URL?.trim()

export const createContactPool = (connectionString: string, max = 8) => {
  const pool = new Pool({
    connectionString,
    max,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    statement_timeout: 4_000,
    query_timeout: 5_000,
  })
  pool.on('error', () => console.error('Contact database pool lost an idle connection'))
  return pool
}

export const getContactPool = () => {
  if (globalDatabase.contactPool) return globalDatabase.contactPool
  const connectionString = resolveContactDatabaseUrl()
  if (!connectionString || connectionString.startsWith('prisma://'))
    throw new Error('contact database unavailable')
  const pool = createContactPool(connectionString)
  globalDatabase.contactPool = pool
  return pool
}

export const getContactDb = () => drizzle(getContactPool(), { schema })
