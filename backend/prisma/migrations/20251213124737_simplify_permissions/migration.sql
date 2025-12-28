/*
  Warnings:

  - You are about to drop the column `can_delete` on the `user_permissions` table. All the data in the column will be lost.
  - You are about to drop the column `can_read` on the `user_permissions` table. All the data in the column will be lost.
  - You are about to drop the column `can_write` on the `user_permissions` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_user_permissions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "module_name" TEXT NOT NULL,
    "has_access" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_user_permissions" ("id", "module_name", "user_id") SELECT "id", "module_name", "user_id" FROM "user_permissions";
DROP TABLE "user_permissions";
ALTER TABLE "new_user_permissions" RENAME TO "user_permissions";
CREATE INDEX "user_permissions_user_id_idx" ON "user_permissions"("user_id");
CREATE UNIQUE INDEX "user_permissions_user_id_module_name_key" ON "user_permissions"("user_id", "module_name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
