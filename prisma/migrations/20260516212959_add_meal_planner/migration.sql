-- CreateTable
CREATE TABLE "MealSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "mealType" TEXT NOT NULL,
    "mealName" TEXT NOT NULL,
    "isToddlerAppropriate" BOOLEAN NOT NULL DEFAULT false,
    "ingredientsStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mealSlotId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Ingredient_mealSlotId_fkey" FOREIGN KEY ("mealSlotId") REFERENCES "MealSlot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ToddlerOverride" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "isHome" BOOLEAN NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "MealSlot_date_mealType_key" ON "MealSlot"("date", "mealType");

-- CreateIndex
CREATE UNIQUE INDEX "ToddlerOverride_date_key" ON "ToddlerOverride"("date");
