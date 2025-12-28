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
    "assigned_to" INTEGER,
    "created_by" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "events_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "event_categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "events_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "events_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_events" ("category_id", "color", "contact_id", "created_at", "created_by", "description", "end_datetime", "id", "is_all_day", "location", "notes", "start_datetime", "status", "title", "updated_at", "visible_to_client") SELECT "category_id", "color", "contact_id", "created_at", "created_by", "description", "end_datetime", "id", "is_all_day", "location", "notes", "start_datetime", "status", "title", "updated_at", "visible_to_client" FROM "events";
DROP TABLE "events";
ALTER TABLE "new_events" RENAME TO "events";
CREATE INDEX "events_start_datetime_idx" ON "events"("start_datetime");
CREATE INDEX "events_contact_id_idx" ON "events"("contact_id");
CREATE INDEX "events_category_id_idx" ON "events"("category_id");
CREATE INDEX "events_assigned_to_idx" ON "events"("assigned_to");
CREATE INDEX "events_created_by_idx" ON "events"("created_by");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
