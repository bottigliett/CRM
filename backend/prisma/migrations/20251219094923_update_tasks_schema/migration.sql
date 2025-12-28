/*
  Warnings:

  - You are about to alter the column `estimated_hours` on the `tasks` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Float`.
  - Added the required column `assigned_to` to the `tasks` table without a default value. This is not possible if the table is not empty.
  - Made the column `category_id` on table `tasks` required. This step will fail if there are existing NULL values in that column.
  - Made the column `deadline` on table `tasks` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateTable
CREATE TABLE "task_categories" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_tasks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "client_id" INTEGER,
    "category_id" INTEGER NOT NULL,
    "assigned_to" INTEGER NOT NULL,
    "created_by" INTEGER NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'P2',
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "deadline" DATETIME NOT NULL,
    "estimated_hours" REAL DEFAULT 0,
    "actual_hours" REAL DEFAULT 0,
    "completed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "updated_by" INTEGER,
    "visible_to_client" BOOLEAN NOT NULL DEFAULT true,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" DATETIME,
    "archived_by" INTEGER,
    CONSTRAINT "tasks_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "contacts" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tasks_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "task_categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tasks_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tasks_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_tasks" ("category_id", "client_id", "completed_at", "created_at", "created_by", "deadline", "description", "estimated_hours", "id", "priority", "status", "title", "updated_at", "visible_to_client") SELECT "category_id", "client_id", "completed_at", "created_at", "created_by", "deadline", "description", "estimated_hours", "id", "priority", "status", "title", "updated_at", "visible_to_client" FROM "tasks";
DROP TABLE "tasks";
ALTER TABLE "new_tasks" RENAME TO "tasks";
CREATE INDEX "tasks_client_id_idx" ON "tasks"("client_id");
CREATE INDEX "tasks_category_id_idx" ON "tasks"("category_id");
CREATE INDEX "tasks_assigned_to_idx" ON "tasks"("assigned_to");
CREATE INDEX "tasks_created_by_idx" ON "tasks"("created_by");
CREATE INDEX "tasks_status_idx" ON "tasks"("status");
CREATE INDEX "tasks_priority_idx" ON "tasks"("priority");
CREATE INDEX "tasks_deadline_idx" ON "tasks"("deadline");
CREATE INDEX "tasks_is_archived_archived_at_idx" ON "tasks"("is_archived", "archived_at");
CREATE INDEX "tasks_client_id_status_idx" ON "tasks"("client_id", "status");
CREATE INDEX "tasks_category_id_status_idx" ON "tasks"("category_id", "status");
CREATE INDEX "tasks_status_completed_at_idx" ON "tasks"("status", "completed_at");
CREATE INDEX "tasks_status_updated_at_idx" ON "tasks"("status", "updated_at");
CREATE INDEX "tasks_status_client_id_category_id_idx" ON "tasks"("status", "client_id", "category_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
