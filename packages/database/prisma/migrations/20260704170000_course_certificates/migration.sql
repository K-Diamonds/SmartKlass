-- AlterTable
ALTER TABLE `courses` ADD COLUMN `offers_certificate` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `certificate_paid_at` DATETIME(3) NULL;
