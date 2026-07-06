-- Domain events outbox, background jobs, versioned course publishing

-- AlterTable
ALTER TABLE `courses` ADD COLUMN `published_version_id` VARCHAR(191) NULL,
    ADD COLUMN `current_version_number` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `outbox_events` (
    `id` VARCHAR(191) NOT NULL,
    `event_type` VARCHAR(100) NOT NULL,
    `aggregate_type` VARCHAR(100) NOT NULL,
    `aggregate_id` VARCHAR(191) NOT NULL,
    `payload` JSON NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `correlation_id` VARCHAR(64) NULL,
    `retry_count` INTEGER NOT NULL DEFAULT 0,
    `max_retries` INTEGER NOT NULL DEFAULT 5,
    `last_error` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processed_at` DATETIME(3) NULL,

    INDEX `outbox_events_status_created_at_idx`(`status`, `created_at`),
    INDEX `outbox_events_aggregate_type_aggregate_id_idx`(`aggregate_type`, `aggregate_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_runs` (
    `id` VARCHAR(191) NOT NULL,
    `job_name` VARCHAR(100) NOT NULL,
    `status` ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `error_message` TEXT NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `job_runs_job_name_created_at_idx`(`job_name`, `created_at`),
    INDEX `job_runs_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `course_versions` (
    `id` VARCHAR(191) NOT NULL,
    `course_id` VARCHAR(191) NOT NULL,
    `version_number` INTEGER NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED', 'SCHEDULED') NOT NULL DEFAULT 'DRAFT',
    `snapshot` JSON NOT NULL,
    `change_summary` TEXT NULL,
    `published_at` DATETIME(3) NULL,
    `scheduled_for` DATETIME(3) NULL,
    `created_by_user_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `course_versions_course_id_status_idx`(`course_id`, `status`),
    UNIQUE INDEX `course_versions_course_id_version_number_key`(`course_id`, `version_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `course_versions` ADD CONSTRAINT `course_versions_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
