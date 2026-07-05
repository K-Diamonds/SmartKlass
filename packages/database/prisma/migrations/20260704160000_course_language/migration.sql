-- Course content language (ISO 639-1)
ALTER TABLE `courses` ADD COLUMN `language` VARCHAR(10) NOT NULL DEFAULT 'en';

CREATE INDEX `courses_language_idx` ON `courses`(`language`);
