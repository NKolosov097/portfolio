import { PrismaClient } from '@/generated/prisma'
import { withAccelerate } from '@prisma/extension-accelerate'

/** Creates a Prisma client. Applies the Accelerate extension only when DATABASE_URL uses the `prisma://` protocol. */
const createPrismaClient = () => {
  const base = new PrismaClient()

  if (process.env.DATABASE_URL?.startsWith('prisma://')) {
    return base.$extends(withAccelerate())
  }

  return base
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
