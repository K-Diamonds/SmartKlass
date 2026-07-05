-- AlterTable
ALTER TABLE `lessons` ADD COLUMN `materials_description` TEXT NULL;

-- AlterTable
ALTER TABLE `lesson_resources`
  ADD COLUMN `description` TEXT NULL,
  ADD COLUMN `purchase_url` VARCHAR(500) NULL,
  ADD COLUMN `access_mode` ENUM('INCLUDED', 'PURCHASE', 'VIDEO') NOT NULL DEFAULT 'INCLUDED';

-- AlterEnum
ALTER TABLE `lesson_resources`
  MODIFY COLUMN `resource_type` ENUM('PDF', 'LINK', 'WORKSHEET', 'CODE', 'VIDEO', 'OTHER') NOT NULL DEFAULT 'LINK';
