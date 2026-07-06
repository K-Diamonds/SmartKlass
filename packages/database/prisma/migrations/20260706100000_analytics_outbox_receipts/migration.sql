-- Analytics snapshots, outbox idempotency receipts, dead letter status

ALTER TABLE `outbox_events` MODIFY `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD_LETTER') NOT NULL DEFAULT 'PENDING';

CREATE TABLE `outbox_handler_receipts` (
    `id` VARCHAR(191) NOT NULL,
    `outbox_event_id` VARCHAR(191) NOT NULL,
    `handler_key` VARCHAR(100) NOT NULL,
    `processed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `outbox_handler_receipts_outbox_event_id_handler_key_key`(`outbox_event_id`, `handler_key`),
    INDEX `outbox_handler_receipts_handler_key_processed_at_idx`(`handler_key`, `processed_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `analytics_snapshots` (
    `id` VARCHAR(191) NOT NULL,
    `snapshot_date` DATE NOT NULL,
    `succeeded_payments` INTEGER NOT NULL DEFAULT 0,
    `creator_transactions` INTEGER NOT NULL DEFAULT 0,
    `active_grants` INTEGER NOT NULL DEFAULT 0,
    `gross_merchandise_cents` INTEGER NOT NULL DEFAULT 0,
    `platform_revenue_cents` INTEGER NOT NULL DEFAULT 0,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `analytics_snapshots_snapshot_date_key`(`snapshot_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
