import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_MEAL_TYPES = [
  { name: "Breakfast", sortOrder: 1 },
  { name: "Lunch", sortOrder: 2 },
  { name: "Dinner", sortOrder: 3 },
] as const;

async function main() {
  for (const mealType of DEFAULT_MEAL_TYPES) {
    await prisma.mealTypeConfig.upsert({
      where: { name: mealType.name },
      create: mealType,
      update: {},
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
