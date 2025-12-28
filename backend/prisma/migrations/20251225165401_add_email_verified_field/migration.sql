-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "password" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "profile_image" TEXT,
    "last_login" DATETIME,
    "theme" TEXT DEFAULT 'system',
    "language" TEXT DEFAULT 'it',
    "selected_theme" TEXT,
    "selected_tweakcn_theme" TEXT,
    "selected_radius" TEXT DEFAULT '0.5rem',
    "imported_theme_data" TEXT,
    "brand_colors" TEXT,
    "sidebar_variant" TEXT DEFAULT 'inset',
    "sidebar_collapsible" TEXT DEFAULT 'offcanvas',
    "sidebar_side" TEXT DEFAULT 'left',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_users" ("brand_colors", "created_at", "email", "first_name", "id", "imported_theme_data", "is_active", "language", "last_login", "last_name", "password", "profile_image", "role", "selected_radius", "selected_theme", "selected_tweakcn_theme", "sidebar_collapsible", "sidebar_side", "sidebar_variant", "theme", "updated_at", "username") SELECT "brand_colors", "created_at", "email", "first_name", "id", "imported_theme_data", "is_active", "language", "last_login", "last_name", "password", "profile_image", "role", "selected_radius", "selected_theme", "selected_tweakcn_theme", "sidebar_collapsible", "sidebar_side", "sidebar_variant", "theme", "updated_at", "username" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
