-- Admin / Risk operations platform

-- AlterTable: processed_stripe_events (webhook replay)
ALTER TABLE `processed_stripe_events`
  ADD COLUMN `replay_requested_at` DATETIME(3) NULL,
  ADD COLUMN `last_replayed_at` DATETIME(3) NULL,
  ADD COLUMN `replay_count` INTEGER NOT NULL DEFAULT 0;

CREATE INDEX `processed_stripe_events_replay_requested_at_idx` ON `processed_stripe_events`(`replay_requested_at`);

-- AlterTable: creator_transactions (admin flags)
ALTER TABLE `creator_transactions`
  ADD COLUMN `admin_flagged_at` DATETIME(3) NULL,
  ADD COLUMN `admin_flag_reason` VARCHAR(500) NULL;

-- AlterTable: refunds (manual review)
ALTER TABLE `refunds`
  ADD COLUMN `admin_approved_at` DATETIME(3) NULL,
  ADD COLUMN `admin_approved_by_user_id` VARCHAR(191) NULL;

-- AlterTable: disputes (chargeback evidence)
ALTER TABLE `disputes`
  ADD COLUMN `evidence_notes` TEXT NULL,
  ADD COLUMN `evidence_submitted_at` DATETIME(3) NULL,
  ADD COLUMN `assigned_admin_user_id` VARCHAR(191) NULL;

-- CreateTable: creator_risk_profiles
CREATE TABLE `creator_risk_profiles` (
  `id` VARCHAR(191) NOT NULL,
  `creator_profile_id` VARCHAR(191) NOT NULL,
  `trust_level` ENUM('NEW', 'STANDARD', 'TRUSTED', 'HIGH_RISK', 'SUSPENDED') NOT NULL DEFAULT 'NEW',
  `payout_delay_days` INTEGER NOT NULL DEFAULT 30,
  `manual_review_required` BOOLEAN NOT NULL DEFAULT false,
  `dispute_rate` DOUBLE NOT NULL DEFAULT 0,
  `refund_rate` DOUBLE NOT NULL DEFAULT 0,
  `lifetime_sales_cents` INTEGER NOT NULL DEFAULT 0,
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `creator_risk_profiles_creator_profile_id_key`(`creator_profile_id`),
  INDEX `creator_risk_profiles_trust_level_idx`(`trust_level`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: creator_risk_events
CREATE TABLE `creator_risk_events` (
  `id` VARCHAR(191) NOT NULL,
  `creator_profile_id` VARCHAR(191) NOT NULL,
  `event_type` VARCHAR(100) NOT NULL,
  `severity` VARCHAR(20) NOT NULL DEFAULT 'info',
  `description` TEXT NOT NULL,
  `metadata` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `creator_risk_events_creator_profile_id_created_at_idx`(`creator_profile_id`, `created_at`),
  INDEX `creator_risk_events_event_type_idx`(`event_type`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: admin_audit_logs
CREATE TABLE `admin_audit_logs` (
  `id` VARCHAR(191) NOT NULL,
  `actor_user_id` VARCHAR(191) NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `target_type` ENUM('CREATOR_PROFILE', 'USER', 'PAYMENT', 'CREATOR_TRANSACTION', 'REFUND', 'DISPUTE', 'COURSE', 'COURSE_ACCESS', 'STRIPE_EVENT', 'RECONCILIATION_REPORT', 'FEATURE_FLAG') NOT NULL,
  `target_id` VARCHAR(191) NOT NULL,
  `before` JSON NULL,
  `after` JSON NULL,
  `reason` TEXT NULL,
  `ip_address` VARCHAR(45) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `admin_audit_logs_actor_user_id_created_at_idx`(`actor_user_id`, `created_at`),
  INDEX `admin_audit_logs_target_type_target_id_idx`(`target_type`, `target_id`),
  INDEX `admin_audit_logs_action_idx`(`action`),
  INDEX `admin_audit_logs_created_at_idx`(`created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: reconciliation_reports
CREATE TABLE `reconciliation_reports` (
  `id` VARCHAR(191) NOT NULL,
  `status` ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
  `period_start` DATETIME(3) NOT NULL,
  `period_end` DATETIME(3) NOT NULL,
  `summary` JSON NULL,
  `discrepancies` JSON NULL,
  `stripe_balance_cents` INTEGER NULL,
  `local_balance_cents` INTEGER NULL,
  `error_message` TEXT NULL,
  `started_at` DATETIME(3) NULL,
  `completed_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `reconciliation_reports_status_idx`(`status`),
  INDEX `reconciliation_reports_period_start_period_end_idx`(`period_start`, `period_end`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: feature_flags
CREATE TABLE `feature_flags` (
  `id` VARCHAR(191) NOT NULL,
  `key` VARCHAR(100) NOT NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT false,
  `description` VARCHAR(500) NULL,
  `config` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `feature_flags_key_key`(`key`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: fraud_rules
CREATE TABLE `fraud_rules` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT true,
  `description` VARCHAR(500) NULL,
  `config` JSON NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `fraud_rules_name_key`(`name`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `creator_risk_profiles` ADD CONSTRAINT `creator_risk_profiles_creator_profile_id_fkey` FOREIGN KEY (`creator_profile_id`) REFERENCES `creator_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `creator_risk_events` ADD CONSTRAINT `creator_risk_events_creator_profile_id_fkey` FOREIGN KEY (`creator_profile_id`) REFERENCES `creator_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `admin_audit_logs` ADD CONSTRAINT `admin_audit_logs_actor_user_id_fkey` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
