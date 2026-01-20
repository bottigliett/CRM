-- AlterTable
ALTER TABLE `client_access` ADD COLUMN `temporary_password` VARCHAR(191) NULL AFTER `password_hash`;
