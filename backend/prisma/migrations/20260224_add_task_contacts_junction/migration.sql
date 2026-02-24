-- CreateTable
CREATE TABLE `task_contacts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `task_id` INTEGER NOT NULL,
    `contact_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `task_contacts_task_id_idx`(`task_id`),
    INDEX `task_contacts_contact_id_idx`(`contact_id`),
    UNIQUE INDEX `task_contacts_task_id_contact_id_key`(`task_id`, `contact_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `task_contacts` ADD CONSTRAINT `task_contacts_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_contacts` ADD CONSTRAINT `task_contacts_contact_id_fkey` FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: copy existing contactId (client_id) into junction table
INSERT INTO `task_contacts` (`task_id`, `contact_id`)
SELECT `id`, `client_id` FROM `tasks` WHERE `client_id` IS NOT NULL
ON DUPLICATE KEY UPDATE `contact_id` = VALUES(`contact_id`);
