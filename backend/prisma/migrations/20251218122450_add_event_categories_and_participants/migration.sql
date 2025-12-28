/*
  Warnings:

  - You are about to drop the column `client_id` on the `events` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "event_categories" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "icon" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "event_participants" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "event_id" INTEGER NOT NULL,
    "contact_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_participants_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_participants_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_events" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start_datetime" DATETIME NOT NULL,
    "end_datetime" DATETIME NOT NULL,
    "category_id" INTEGER,
    "contact_id" INTEGER,
    "location" TEXT,
    "notes" TEXT,
    "status" TEXT DEFAULT 'scheduled',
    "color" TEXT DEFAULT '#3b82f6',
    "is_all_day" BOOLEAN NOT NULL DEFAULT false,
    "visible_to_client" BOOLEAN NOT NULL DEFAULT false,
    "created_by" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "events_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "event_categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "events_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_events" ("category_id", "created_at", "created_by", "description", "end_datetime", "id", "location", "notes", "start_datetime", "status", "title", "updated_at", "visible_to_client") SELECT "category_id", "created_at", "created_by", "description", "end_datetime", "id", "location", "notes", "start_datetime", "status", "title", "updated_at", "visible_to_client" FROM "events";
DROP TABLE "events";
ALTER TABLE "new_events" RENAME TO "events";
CREATE INDEX "events_start_datetime_idx" ON "events"("start_datetime");
CREATE INDEX "events_contact_id_idx" ON "events"("contact_id");
CREATE INDEX "events_category_id_idx" ON "events"("category_id");
CREATE INDEX "events_created_by_idx" ON "events"("created_by");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "event_categories_name_key" ON "event_categories"("name");

-- CreateIndex
CREATE INDEX "event_participants_event_id_idx" ON "event_participants"("event_id");

-- CreateIndex
CREATE INDEX "event_participants_contact_id_idx" ON "event_participants"("contact_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_participants_event_id_contact_id_key" ON "event_participants"("event_id", "contact_id");
