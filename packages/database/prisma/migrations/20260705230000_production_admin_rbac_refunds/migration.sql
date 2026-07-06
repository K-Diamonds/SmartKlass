-- Production CTO: RBAC, refund workflow, reconciliation v2 prep

-- Admin RBAC
CREATE TABLE `admin_roles` (
  `id` VARCHAR(191) NOT NULL,
  `key` ENUM('SUPER_ADMIN', 'RISK_ANALYST', 'FINANCE', 'SUPPORT', 'READ_ONLY') NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(500) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `admin_roles_key_key`(`key`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `admin_permissions` (
  `id` VARCHAR(191) NOT NULL,
  `key` VARCHAR(100) NOT NULL,
  `description` VARCHAR(500) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `admin_permissions_key_key`(`key`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `admin_user_roles` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `role_id` VARCHAR(191) NOT NULL,
  `assigned_by_user_id` VARCHAR(191) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `admin_user_roles_user_id_role_id_key`(`user_id`, `role_id`),
  INDEX `admin_user_roles_user_id_idx`(`user_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `admin_role_permissions` (
  `id` VARCHAR(191) NOT NULL,
  `role_id` VARCHAR(191) NOT NULL,
  `permission_id` VARCHAR(191) NOT NULL,
  UNIQUE INDEX `admin_role_permissions_role_id_permission_id_key`(`role_id`, `permission_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Refund execution workflow (separate from Stripe-synced refunds)
CREATE TABLE `refund_requests` (
  `id` VARCHAR(191) NOT NULL,
  `payment_id` VARCHAR(191) NOT NULL,
  `creator_transaction_id` VARCHAR(191) NULL,
  `requested_by_user_id` VARCHAR(191) NOT NULL,
  `amount_cents` INTEGER NOT NULL,
  `currency` VARCHAR(3) NOT NULL DEFAULT 'USD',
  `reason` TEXT NOT NULL,
  `status` ENUM('REQUESTED', 'APPROVED', 'DENIED', 'EXECUTING', 'EXECUTED', 'FAILED') NOT NULL DEFAULT 'REQUESTED',
  `approved_at` DATETIME(3) NULL,
  `approved_by_user_id` VARCHAR(191) NULL,
  `denied_at` DATETIME(3) NULL,
  `denied_by_user_id` VARCHAR(191) NULL,
  `denial_reason` TEXT NULL,
  `executed_at` DATETIME(3) NULL,
  `executed_by_user_id` VARCHAR(191) NULL,
  `execution_error` TEXT NULL,
  `stripe_refund_id` VARCHAR(191) NULL,
  `refund_id` VARCHAR(191) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `refund_requests_stripe_refund_id_key`(`stripe_refund_id`),
  UNIQUE INDEX `refund_requests_refund_id_key`(`refund_id`),
  INDEX `refund_requests_payment_id_idx`(`payment_id`),
  INDEX `refund_requests_status_idx`(`status`),
  INDEX `refund_requests_created_at_idx`(`created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `admin_audit_logs` MODIFY `target_type` ENUM('CREATOR_PROFILE', 'USER', 'PAYMENT', 'CREATOR_TRANSACTION', 'REFUND', 'DISPUTE', 'COURSE', 'COURSE_ACCESS', 'STRIPE_EVENT', 'RECONCILIATION_REPORT', 'FEATURE_FLAG', 'REFUND_REQUEST') NOT NULL;

ALTER TABLE `admin_user_roles` ADD CONSTRAINT `admin_user_roles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `admin_user_roles` ADD CONSTRAINT `admin_user_roles_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `admin_roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `admin_role_permissions` ADD CONSTRAINT `admin_role_permissions_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `admin_roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `admin_role_permissions` ADD CONSTRAINT `admin_role_permissions_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `admin_permissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `refund_requests` ADD CONSTRAINT `refund_requests_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `refund_requests` ADD CONSTRAINT `refund_requests_creator_transaction_id_fkey` FOREIGN KEY (`creator_transaction_id`) REFERENCES `creator_transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `refund_requests` ADD CONSTRAINT `refund_requests_requested_by_user_id_fkey` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `refund_requests` ADD CONSTRAINT `refund_requests_approved_by_user_id_fkey` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `refund_requests` ADD CONSTRAINT `refund_requests_denied_by_user_id_fkey` FOREIGN KEY (`denied_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `refund_requests` ADD CONSTRAINT `refund_requests_executed_by_user_id_fkey` FOREIGN KEY (`executed_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `refund_requests` ADD CONSTRAINT `refund_requests_refund_id_fkey` FOREIGN KEY (`refund_id`) REFERENCES `refunds`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
