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
  // Name the failed condition: both spellings surface as the same opaque 500 to the caller, and
  // telling them apart in the log is the difference between "set the variable" and "it is stale".
  if (!connectionString)
    throw new Error(
      'contact database unavailable: neither CONTACT_DB_DATABASE_URL nor DATABASE_URL is set',
    )
  if (connectionString.startsWith('prisma://'))
    throw new Error(
      'contact database unavailable: the configured URL is a prisma:// Accelerate URL, which needs a direct postgres:// connection',
    )
  const pool = createContactPool(connectionString)
  globalDatabase.contactPool = pool
  return pool
}

export const getContactDb = () => drizzle(getContactPool(), { schema })
