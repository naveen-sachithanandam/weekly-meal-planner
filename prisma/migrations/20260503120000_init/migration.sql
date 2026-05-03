-- CreateTable
CREATE TABLE "WeeklyPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weekStartSunday" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DayPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weeklyPlanId" TEXT NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "isTrip" BOOLEAN NOT NULL DEFAULT false,
    "tripNotes" TEXT,
    CONSTRAINT "DayPlan_weeklyPlanId_fkey" FOREIGN KEY ("weeklyPlanId") REFERENCES "WeeklyPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MealSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dayPlanId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "mainMealText" TEXT NOT NULL DEFAULT '',
    "proteinWarning" BOOLEAN NOT NULL DEFAULT false,
    "isQuick" BOOLEAN NOT NULL DEFAULT false,
    "isMakeAhead" BOOLEAN NOT NULL DEFAULT false,
    "isEasy" BOOLEAN NOT NULL DEFAULT false,
    "needsTime" BOOLEAN NOT NULL DEFAULT false,
    "toddlerFriendly" BOOLEAN NOT NULL DEFAULT false,
    "toddlerNote" TEXT,
    CONSTRAINT "MealSlot_dayPlanId_fkey" FOREIGN KEY ("dayPlanId") REFERENCES "DayPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShoppingLineGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weeklyPlanId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "mergeKey" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "alreadyHave" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ShoppingLineGroup_weeklyPlanId_fkey" FOREIGN KEY ("weeklyPlanId") REFERENCES "WeeklyPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShoppingLineContribution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shoppingLineGroupId" TEXT NOT NULL,
    "mealSlotId" TEXT,
    "quantityText" TEXT NOT NULL,
    "mergeUnitKey" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ShoppingLineContribution_shoppingLineGroupId_fkey" FOREIGN KEY ("shoppingLineGroupId") REFERENCES "ShoppingLineGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ShoppingLineContribution_mealSlotId_fkey" FOREIGN KEY ("mealSlotId") REFERENCES "MealSlot" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FavoriteMeal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "notes" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyPlan_weekStartSunday_key" ON "WeeklyPlan"("weekStartSunday");

-- CreateIndex
CREATE UNIQUE INDEX "DayPlan_weeklyPlanId_dayOfWeek_key" ON "DayPlan"("weeklyPlanId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "MealSlot_dayPlanId_slot_key" ON "MealSlot"("dayPlanId", "slot");

-- CreateIndex
CREATE INDEX "ShoppingLineGroup_weeklyPlanId_mergeKey_idx" ON "ShoppingLineGroup"("weeklyPlanId", "mergeKey");

-- CreateIndex
CREATE INDEX "ShoppingLineGroup_weeklyPlanId_section_sortOrder_idx" ON "ShoppingLineGroup"("weeklyPlanId", "section", "sortOrder");

-- CreateIndex
CREATE INDEX "ShoppingLineContribution_shoppingLineGroupId_idx" ON "ShoppingLineContribution"("shoppingLineGroupId");

-- CreateIndex
CREATE INDEX "ShoppingLineContribution_mealSlotId_idx" ON "ShoppingLineContribution"("mealSlotId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteMeal_name_key" ON "FavoriteMeal"("name");
