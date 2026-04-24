/**
 * Shared Database Layer
 * Single Prisma client instance used across all modules
 * 
 * RULES:
 * - All direct database operations go through this client
 * - Modules access via dependency injection (passed in services)
 * - No global imports of prisma in controller files
 */

import { PrismaClient } from '@prisma/client'
import { env } from '../../config/env'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  })

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

/**
 * Graceful shutdown
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect()
}

/**
 * Health check
 */
export async function checkPrismaHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  }
}
