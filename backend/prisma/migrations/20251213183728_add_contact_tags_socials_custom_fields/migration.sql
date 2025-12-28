/*
  Warnings:

  - You are about to drop the column `tags` on the `contacts` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "contact_tags" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "contact_id" INTEGER NOT NULL,
    "tag" TEXT NOT NULL,
    "color" TEXT DEFAULT '#3b82f6',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contact_tags_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "contact_socials" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "contact_id" INTEGER NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "username" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contact_socials_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "contact_custom_fields" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "contact_id" INTEGER NOT NULL,
    "field_name" TEXT NOT NULL,
    "field_value" TEXT NOT NULL,
    "field_type" TEXT NOT NULL DEFAULT 'text',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "contact_custom_fields_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_contacts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'LEAD',
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
    "lead_source" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_contacts" ("address", "codice_fiscale", "created_at", "email", "funnel_stage", "funnel_value", "id", "lead_source", "name", "notes", "partita_iva", "phone", "priority", "status", "type", "updated_at", "website") SELECT "address", "codice_fiscale", "created_at", "email", "funnel_stage", "funnel_value", "id", "lead_source", "name", "notes", "partita_iva", "phone", "priority", "status", "type", "updated_at", "website" FROM "contacts";
DROP TABLE "contacts";
ALTER TABLE "new_contacts" RENAME TO "contacts";
CREATE INDEX "contacts_type_idx" ON "contacts"("type");
CREATE INDEX "contacts_funnel_stage_idx" ON "contacts"("funnel_stage");
CREATE INDEX "contacts_email_idx" ON "contacts"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "contact_tags_contact_id_idx" ON "contact_tags"("contact_id");

-- CreateIndex
CREATE INDEX "contact_tags_tag_idx" ON "contact_tags"("tag");

-- CreateIndex
CREATE INDEX "contact_socials_contact_id_idx" ON "contact_socials"("contact_id");

-- CreateIndex
CREATE INDEX "contact_custom_fields_contact_id_idx" ON "contact_custom_fields"("contact_id");
