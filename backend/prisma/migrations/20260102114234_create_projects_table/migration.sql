-- DropIndex
DROP INDEX "user_sessions_token_idx";

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN "quote_id" INTEGER;

-- CreateTable
CREATE TABLE "task_team_members" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "task_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "task_team_members_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "task_team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "projects" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "contact_id" INTEGER NOT NULL,
    "budget" REAL NOT NULL,
    "estimated_hours" REAL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "start_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "created_by" INTEGER NOT NULL,
    CONSTRAINT "projects_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "event_team_members" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "event_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_team_members_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_tasks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "client_id" INTEGER,
    "category_id" INTEGER,
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
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "tasks_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "contacts" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tasks_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "task_categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tasks_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tasks_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_tasks" ("actual_hours", "archived_at", "archived_by", "assigned_to", "category_id", "client_id", "completed_at", "created_at", "created_by", "deadline", "description", "estimated_hours", "id", "is_archived", "is_favorite", "priority", "status", "title", "updated_at", "updated_by", "visible_to_client") SELECT "actual_hours", "archived_at", "archived_by", "assigned_to", "category_id", "client_id", "completed_at", "created_at", "created_by", "deadline", "description", "estimated_hours", "id", "is_archived", "is_favorite", "priority", "status", "title", "updated_at", "updated_by", "visible_to_client" FROM "tasks";
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

-- CreateIndex
CREATE INDEX "task_team_members_task_id_idx" ON "task_team_members"("task_id");

-- CreateIndex
CREATE INDEX "task_team_members_user_id_idx" ON "task_team_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_team_members_task_id_user_id_key" ON "task_team_members"("task_id", "user_id");

-- CreateIndex
CREATE INDEX "projects_contact_id_idx" ON "projects"("contact_id");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "projects_created_by_idx" ON "projects"("created_by");

-- CreateIndex
CREATE INDEX "event_team_members_event_id_idx" ON "event_team_members"("event_id");

-- CreateIndex
CREATE INDEX "event_team_members_user_id_idx" ON "event_team_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_team_members_event_id_user_id_key" ON "event_team_members"("event_id", "user_id");
