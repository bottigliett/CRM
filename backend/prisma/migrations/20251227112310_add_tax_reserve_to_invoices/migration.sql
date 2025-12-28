-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_invoices" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "invoice_number" TEXT NOT NULL,
    "contact_id" INTEGER,
    "client_name" TEXT NOT NULL,
    "client_address" TEXT,
    "client_piva" TEXT,
    "client_cf" TEXT,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "quantity" REAL NOT NULL DEFAULT 1.00,
    "unit_price" REAL NOT NULL,
    "subtotal" REAL NOT NULL,
    "vat_percentage" REAL NOT NULL DEFAULT 0,
    "vat_amount" REAL NOT NULL,
    "total" REAL NOT NULL,
    "issue_date" DATETIME NOT NULL,
    "due_date" DATETIME NOT NULL,
    "payment_days" INTEGER NOT NULL DEFAULT 30,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "payment_date" DATETIME,
    "payment_method" TEXT,
    "payment_notes" TEXT,
    "tax_reserved" BOOLEAN NOT NULL DEFAULT false,
    "tax_amount" REAL,
    "fiscal_notes" TEXT,
    "pdf_path" TEXT,
    "pdf_generated_at" DATETIME,
    "created_by" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "invoices_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "invoices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_invoices" ("client_address", "client_cf", "client_name", "client_piva", "contact_id", "created_at", "created_by", "description", "due_date", "fiscal_notes", "id", "invoice_number", "issue_date", "payment_date", "payment_days", "payment_method", "payment_notes", "pdf_generated_at", "pdf_path", "quantity", "status", "subject", "subtotal", "total", "unit_price", "updated_at", "vat_amount", "vat_percentage") SELECT "client_address", "client_cf", "client_name", "client_piva", "contact_id", "created_at", "created_by", "description", "due_date", "fiscal_notes", "id", "invoice_number", "issue_date", "payment_date", "payment_days", "payment_method", "payment_notes", "pdf_generated_at", "pdf_path", "quantity", "status", "subject", "subtotal", "total", "unit_price", "updated_at", "vat_amount", "vat_percentage" FROM "invoices";
DROP TABLE "invoices";
ALTER TABLE "new_invoices" RENAME TO "invoices";
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");
CREATE INDEX "invoices_invoice_number_idx" ON "invoices"("invoice_number");
CREATE INDEX "invoices_contact_id_idx" ON "invoices"("contact_id");
CREATE INDEX "invoices_issue_date_idx" ON "invoices"("issue_date");
CREATE INDEX "invoices_due_date_idx" ON "invoices"("due_date");
CREATE INDEX "invoices_status_idx" ON "invoices"("status");
CREATE INDEX "invoices_created_by_idx" ON "invoices"("created_by");
CREATE INDEX "invoices_status_due_date_idx" ON "invoices"("status", "due_date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
