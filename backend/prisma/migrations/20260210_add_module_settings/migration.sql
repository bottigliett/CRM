-- CreateTable: module_settings
CREATE TABLE `module_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `module_name` VARCHAR(191) NOT NULL,
    `is_enabled` BOOLEAN NOT NULL DEFAULT true,
    `label` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `display_order` INTEGER NOT NULL DEFAULT 0,
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `module_settings_module_name_key`(`module_name`),
    INDEX `module_settings_is_enabled_idx`(`is_enabled`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed initial modules (all enabled by default)
INSERT INTO `module_settings` (`module_name`, `label`, `description`, `display_order`, `is_enabled`) VALUES
('dashboard', 'Dashboard', 'Panoramica generale', 0, true),
('lead_board', 'Lead Board', 'Gestione lead e funnel', 1, true),
('contacts', 'Contatti', 'Gestione contatti', 2, true),
('clients', 'Clienti', 'Gestione dashboard clienti', 3, true),
('calendar', 'Agenda', 'Calendario eventi', 4, true),
('tasks', 'Task Manager', 'Gestione task', 5, true),
('tickets', 'Ticket System', 'Sistema di supporto ticket', 6, true),
('finance', 'Finance Tracker', 'Gestione finanze', 7, true),
('invoices', 'Fatture', 'Gestione fatture', 8, true),
('projects', 'Progetti', 'Gestione progetti', 9, true),
('on_duty', 'On Duty', 'Postazione di lavoro', 10, true);
