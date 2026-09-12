import 'server-only'

import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import * as schema from '@/db/schema'

const globalDatabase = globalThis as typeof globalThis & { contactPool?: Pool }

export const createContactPool = (connectionString: string, max = 8) => {
  const pool = new Pool({
    connectionString,
    max,
    connectionTimeoutMillis: 2_000,
    idleTimeoutMillis: 30_000,
    statement_timeout: 4_000,
    query_timeout: 5_000,
    options: '-c lock_timeout=2000',
  })
  pool.on('error', () => console.error('Contact database pool lost an idle connection'))
  return pool
}

export const getContactPool = () => {
  if (globalDatabase.contactPool) return globalDatabase.contactPool
  const connectionString = process.env.DATABASE_URL
  if (!connectionString || connectionString.startsWith('prisma://'))
    throw new Error('contact database unavailable')
  const pool = createContactPool(connectionString)
  globalDatabase.contactPool = pool
  return pool
}

export const getContactDb = () => drizzle(getContactPool(), { schema })
