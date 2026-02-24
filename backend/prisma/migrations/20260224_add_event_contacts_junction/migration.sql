-- CreateTable
CREATE TABLE `event_contacts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `event_id` INTEGER NOT NULL,
    `contact_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `event_contacts_event_id_idx`(`event_id`),
    INDEX `event_contacts_contact_id_idx`(`contact_id`),
    UNIQUE INDEX `event_contacts_event_id_contact_id_key`(`event_id`, `contact_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `event_contacts` ADD CONSTRAINT `event_contacts_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_contacts` ADD CONSTRAINT `event_contacts_contact_id_fkey` FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: copy existing contactId into event_contacts junction table
INSERT INTO `event_contacts` (`event_id`, `contact_id`)
SELECT `id`, `contact_id` FROM `events` WHERE `contact_id` IS NOT NULL;
