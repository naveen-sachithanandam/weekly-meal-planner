import { PrismaClient } from "@prisma/client";

import { VALID_ENV } from "./env";

let client: PrismaClient | undefined;

export function getTestPrisma(): PrismaClient {
  if (!client) {
    process.env.DATABASE_URL = VALID_ENV.DATABASE_URL;
    client = new PrismaClient();
  }
  return client;
}

export async function resetTestDatabase() {
  const prisma = getTestPrisma();
  await prisma.ingredient.deleteMany();
  await prisma.mealSlot.deleteMany();
  await prisma.toddlerOverride.deleteMany();
}
