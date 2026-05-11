import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma'
import { withAccelerate } from '@prisma/extension-accelerate'

/** Creates a Prisma client. Uses Accelerate when DATABASE_URL starts with `prisma://`, otherwise connects via the pg driver adapter. */
const createPrismaClient = () => {
  /** Database connection string resolved from the environment at client creation time. */
  const url = process.env.DATABASE_URL ?? ''

  if (url.startsWith('prisma://')) {
    return new PrismaClient({ accelerateUrl: url }).$extends(withAccelerate())
  }

  /** pg driver adapter required by Prisma 7 for direct PostgreSQL connections. */
  const adapter = new PrismaPg({ connectionString: url })
  return new PrismaClient({ adapter })
}

/** Inferred union type covering both plain and Accelerate-extended clients. */
type PrismaClientInstance = ReturnType<typeof createPrismaClient>

declare const globalThis: {
  /** Cached Prisma client singleton for non-production environments. */
  prismaGlobal: PrismaClientInstance
} & typeof global

const prisma: PrismaClientInstance = globalThis.prismaGlobal ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma

export default prisma
