import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Example favourites for local/dev seed — replace with your own list when you maintain `SPEC.local.md`. */
const FAVORITE_MEALS: ReadonlyArray<{
  name: string;
  category: string;
  notes: string;
}> = [
  // Vegetarian mains
  {
    name: "Rice and dal (protein: dal)",
    category: "Vegetarian mains",
    notes: "Dal protein — rice pairing staple.",
  },
  {
    name: "Chapati with sabzi",
    category: "Vegetarian mains",
    notes: "Roti plus vegetable sabzi.",
  },
  {
    name: "Idli / dosa",
    category: "Vegetarian mains",
    notes: "Batter kept ready — easy dinner.",
  },
  {
    name: "Sambar rice (batch cook)",
    category: "Vegetarian mains",
    notes: "Batch cook sambar — use across 2 days.",
  },
  {
    name: "Rasam rice",
    category: "Vegetarian mains",
    notes: "Peppery rasam with rice.",
  },
  {
    name: "Curd rice (protein: yogurt)",
    category: "Vegetarian mains",
    notes: "Protein: yogurt / curd.",
  },

  // Light breakfast / snacks
  {
    name: "Thalipeeth (make-ahead)",
    category: "Light breakfast / snacks",
    notes: "Make-ahead friendly — reheat to serve.",
  },
  {
    name: "Poha (quick — not Mon/Tue)",
    category: "Light breakfast / snacks",
    notes: "Quick breakfast — not Mon/Tue rush mornings.",
  },
  {
    name: "Upma (quick — not Mon/Tue)",
    category: "Light breakfast / snacks",
    notes: "Quick breakfast — not Mon/Tue rush mornings.",
  },
  {
    name: "Misal pav (protein: sprouted lentils)",
    category: "Light breakfast / snacks",
    notes: "Protein: sprouted lentils.",
  },
  {
    name: "Bhakri with vegetables",
    category: "Light breakfast / snacks",
    notes: "Bhakri with vegetable sides.",
  },
  {
    name: "Sabudana khichdi (protein: peanuts)",
    category: "Light breakfast / snacks",
    notes: "Protein: peanuts.",
  },

  // Other
  {
    name: "Egg toast (protein: eggs)",
    category: "Other",
    notes: "Protein: eggs.",
  },
  {
    name: "Vegetable curry",
    category: "Other",
    notes: "Flexible vegetable curry.",
  },
  {
    name: "Bread and eggs (protein: eggs)",
    category: "Other",
    notes: "Protein: eggs.",
  },
  {
    name: "Rice and rajma (protein: rajma)",
    category: "Other",
    notes: "Protein: rajma.",
  },
  {
    name: "Moong dal chilla (protein: moong)",
    category: "Other",
    notes: "Protein: moong.",
  },
  {
    name: "Paneer bhurji (protein: paneer)",
    category: "Other",
    notes: "Protein: paneer.",
  },
];

async function main(): Promise<void> {
  for (const row of FAVORITE_MEALS) {
    await prisma.favoriteMeal.upsert({
      where: { name: row.name },
      create: {
        name: row.name,
        category: row.category,
        notes: row.notes,
      },
      update: {
        category: row.category,
        notes: row.notes,
      },
    });
  }

  const total = await prisma.favoriteMeal.count();
  console.log(`FavoriteMeal rows (after seed upserts): ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
