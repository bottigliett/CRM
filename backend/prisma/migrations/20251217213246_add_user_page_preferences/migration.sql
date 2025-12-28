-- CreateTable
CREATE TABLE "user_page_preferences" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "page_name" TEXT NOT NULL,
    "view_mode" TEXT,
    "page_limit" INTEGER,
    "type_filter" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "user_page_preferences_user_id_idx" ON "user_page_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_page_preferences_user_id_page_name_key" ON "user_page_preferences"("user_id", "page_name");
