import { PrismaClient } from "@prisma/client";

/**
 * Reuse one Prisma Client across hot reloads in development so SQLite connections do not multiply.
 * In production each Node process still constructs a single instance per module graph load.
 */
const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
