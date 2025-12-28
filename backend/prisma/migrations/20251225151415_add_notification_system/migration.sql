-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "used_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "email_verification_codes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" DATETIME,
    "event_id" INTEGER,
    "task_id" INTEGER,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "event_reminders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "event_id" INTEGER NOT NULL,
    "reminder_type" TEXT NOT NULL,
    "send_email" BOOLEAN NOT NULL DEFAULT false,
    "email_sent" BOOLEAN NOT NULL DEFAULT false,
    "email_sent_at" DATETIME,
    "send_browser" BOOLEAN NOT NULL DEFAULT true,
    "browser_sent" BOOLEAN NOT NULL DEFAULT false,
    "browser_sent_at" DATETIME,
    "scheduled_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_reminders_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "email_event_reminder" BOOLEAN NOT NULL DEFAULT true,
    "email_event_assigned" BOOLEAN NOT NULL DEFAULT true,
    "email_task_assigned" BOOLEAN NOT NULL DEFAULT true,
    "email_task_due_soon" BOOLEAN NOT NULL DEFAULT true,
    "email_task_overdue" BOOLEAN NOT NULL DEFAULT true,
    "browser_enabled" BOOLEAN NOT NULL DEFAULT true,
    "browser_event_reminder" BOOLEAN NOT NULL DEFAULT true,
    "browser_event_assigned" BOOLEAN NOT NULL DEFAULT true,
    "browser_task_assigned" BOOLEAN NOT NULL DEFAULT true,
    "browser_task_due_soon" BOOLEAN NOT NULL DEFAULT true,
    "browser_task_overdue" BOOLEAN NOT NULL DEFAULT true,
    "center_enabled" BOOLEAN NOT NULL DEFAULT true,
    "default_reminder_enabled" BOOLEAN NOT NULL DEFAULT false,
    "default_reminder_type" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_contacts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'COLLABORATION',
    "contact_type" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "address" TEXT,
    "city" TEXT,
    "province" TEXT,
    "zip_code" TEXT,
    "country" TEXT DEFAULT 'IT',
    "partita_iva" TEXT,
    "codice_fiscale" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "priority" INTEGER DEFAULT 0,
    "status" TEXT DEFAULT 'active',
    "funnel_stage" TEXT,
    "funnel_value" REAL,
    "funnel_position" INTEGER DEFAULT 0,
    "lead_source" TEXT,
    "service_type" TEXT,
    "contact_date" DATETIME,
    "linked_contact_id" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_contacts" ("address", "city", "codice_fiscale", "contact_date", "contact_type", "country", "created_at", "email", "funnel_position", "funnel_stage", "funnel_value", "id", "lead_source", "linked_contact_id", "mobile", "name", "notes", "partita_iva", "phone", "priority", "province", "service_type", "status", "type", "updated_at", "website", "zip_code") SELECT "address", "city", "codice_fiscale", "contact_date", "contact_type", "country", "created_at", "email", "funnel_position", "funnel_stage", "funnel_value", "id", "lead_source", "linked_contact_id", "mobile", "name", "notes", "partita_iva", "phone", "priority", "province", "service_type", "status", "type", "updated_at", "website", "zip_code" FROM "contacts";
DROP TABLE "contacts";
ALTER TABLE "new_contacts" RENAME TO "contacts";
CREATE INDEX "contacts_type_idx" ON "contacts"("type");
CREATE INDEX "contacts_funnel_stage_idx" ON "contacts"("funnel_stage");
CREATE INDEX "contacts_email_idx" ON "contacts"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_email_idx" ON "password_reset_tokens"("email");

-- CreateIndex
CREATE INDEX "password_reset_tokens_token_idx" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_codes_code_key" ON "email_verification_codes"("code");

-- CreateIndex
CREATE INDEX "email_verification_codes_email_idx" ON "email_verification_codes"("email");

-- CreateIndex
CREATE INDEX "email_verification_codes_code_idx" ON "email_verification_codes"("code");

-- CreateIndex
CREATE INDEX "email_verification_codes_expires_at_idx" ON "email_verification_codes"("expires_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "event_reminders_event_id_idx" ON "event_reminders"("event_id");

-- CreateIndex
CREATE INDEX "event_reminders_scheduled_at_idx" ON "event_reminders"("scheduled_at");

-- CreateIndex
CREATE INDEX "event_reminders_send_email_email_sent_idx" ON "event_reminders"("send_email", "email_sent");

-- CreateIndex
CREATE INDEX "event_reminders_send_browser_browser_sent_idx" ON "event_reminders"("send_browser", "browser_sent");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_key" ON "notification_preferences"("user_id");

-- CreateIndex
CREATE INDEX "notification_preferences_user_id_idx" ON "notification_preferences"("user_id");
