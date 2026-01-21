-- Add project_duration_days column to quotes table if it doesn't exist
ALTER TABLE `crm_dashboard`.`quotes` ADD COLUMN IF NOT EXISTS `project_duration_days` INT NULL COMMENT 'Durata stimata del progetto in giorni';
