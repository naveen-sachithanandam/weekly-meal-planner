-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ShoppingLineContribution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shoppingLineGroupId" TEXT NOT NULL,
    "mealSlotId" TEXT,
    "quantityText" TEXT NOT NULL DEFAULT '',
    "mergeUnitKey" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ShoppingLineContribution_shoppingLineGroupId_fkey" FOREIGN KEY ("shoppingLineGroupId") REFERENCES "ShoppingLineGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ShoppingLineContribution_mealSlotId_fkey" FOREIGN KEY ("mealSlotId") REFERENCES "MealSlot" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ShoppingLineContribution" ("id", "mealSlotId", "mergeUnitKey", "quantityText", "shoppingLineGroupId", "sortOrder") SELECT "id", "mealSlotId", "mergeUnitKey", "quantityText", "shoppingLineGroupId", "sortOrder" FROM "ShoppingLineContribution";
DROP TABLE "ShoppingLineContribution";
ALTER TABLE "new_ShoppingLineContribution" RENAME TO "ShoppingLineContribution";
CREATE INDEX "ShoppingLineContribution_shoppingLineGroupId_idx" ON "ShoppingLineContribution"("shoppingLineGroupId");
CREATE INDEX "ShoppingLineContribution_mealSlotId_idx" ON "ShoppingLineContribution"("mealSlotId");
CREATE TABLE "new_WeeklyPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weekStartSunday" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_WeeklyPlan" ("createdAt", "id", "updatedAt", "weekStartSunday") SELECT "createdAt", "id", "updatedAt", "weekStartSunday" FROM "WeeklyPlan";
DROP TABLE "WeeklyPlan";
ALTER TABLE "new_WeeklyPlan" RENAME TO "WeeklyPlan";
CREATE UNIQUE INDEX "WeeklyPlan_weekStartSunday_key" ON "WeeklyPlan"("weekStartSunday");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
