-- AlterTable
ALTER TABLE "contacts" ADD COLUMN "funnel_position" INTEGER DEFAULT 0;

-- CreateTable
CREATE TABLE "lead_funnel_stages" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "color" TEXT DEFAULT '#3b82f6',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "lead_funnel_stages_name_key" ON "lead_funnel_stages"("name");

-- CreateIndex
CREATE UNIQUE INDEX "lead_funnel_stages_order_key" ON "lead_funnel_stages"("order");
