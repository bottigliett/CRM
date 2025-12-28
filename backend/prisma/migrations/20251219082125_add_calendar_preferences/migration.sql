-- CreateTable
CREATE TABLE "calendar_preferences" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "default_view" TEXT,
    "default_start_hour" INTEGER,
    "default_end_hour" INTEGER,
    "favorite_categories" TEXT,
    "show_weekends" BOOLEAN DEFAULT true,
    "default_event_duration" INTEGER,
    "hide_sidebar" BOOLEAN DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "calendar_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "calendar_preferences_user_id_key" ON "calendar_preferences"("user_id");

-- CreateIndex
CREATE INDEX "calendar_preferences_user_id_idx" ON "calendar_preferences"("user_id");
