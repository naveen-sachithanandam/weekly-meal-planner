/*
  Warnings:

  - You are about to drop the column `mealType` on the `MealSlot` table. All the data in the column will be lost.
  - Added the required column `mealTypeConfigId` to the `MealSlot` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "MealTypeConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MealSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "mealTypeConfigId" TEXT NOT NULL,
    "mealName" TEXT NOT NULL,
    "isToddlerAppropriate" BOOLEAN NOT NULL DEFAULT false,
    "ingredientsStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MealSlot_mealTypeConfigId_fkey" FOREIGN KEY ("mealTypeConfigId") REFERENCES "MealTypeConfig" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_MealSlot" ("createdAt", "date", "id", "ingredientsStatus", "isToddlerAppropriate", "mealName", "updatedAt") SELECT "createdAt", "date", "id", "ingredientsStatus", "isToddlerAppropriate", "mealName", "updatedAt" FROM "MealSlot";
DROP TABLE "MealSlot";
ALTER TABLE "new_MealSlot" RENAME TO "MealSlot";
CREATE UNIQUE INDEX "MealSlot_date_mealTypeConfigId_key" ON "MealSlot"("date", "mealTypeConfigId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "MealTypeConfig_name_key" ON "MealTypeConfig"("name");
