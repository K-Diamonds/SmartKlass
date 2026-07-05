-- Marketplace accounting tables for Stripe Connect reconciliation

CREATE TABLE `creator_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `creator_profile_id` VARCHAR(191) NOT NULL,
    `payment_id` VARCHAR(191) NULL,
    `course_id` VARCHAR(191) NOT NULL,
    `access_plan_id` VARCHAR(191) NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `type` ENUM('ONE_TIME_PURCHASE', 'SUBSCRIPTION_CHARGE') NOT NULL,
    `status` ENUM('PENDING', 'PENDING_PAYOUT', 'AVAILABLE', 'PAID_OUT', 'REFUNDED', 'DISPUTED', 'REVERSED') NOT NULL DEFAULT 'PENDING',
    `gross_amount_cents` INTEGER NOT NULL,
    `platform_fee_cents` INTEGER NOT NULL,
    `creator_earnings_cents` INTEGER NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'USD',
    `stripe_payment_intent_id` VARCHAR(191) NULL,
    `stripe_charge_id` VARCHAR(191) NULL,
    `stripe_invoice_id` VARCHAR(191) NULL,
    `available_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `creator_transactions_payment_id_key`(`payment_id`),
    UNIQUE INDEX `creator_transactions_stripe_payment_intent_id_key`(`stripe_payment_intent_id`),
    UNIQUE INDEX `creator_transactions_stripe_charge_id_key`(`stripe_charge_id`),
    INDEX `creator_transactions_creator_profile_id_created_at_idx`(`creator_profile_id`, `created_at`),
    INDEX `creator_transactions_course_id_idx`(`course_id`),
    INDEX `creator_transactions_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `platform_fees` (
    `id` VARCHAR(191) NOT NULL,
    `creator_transaction_id` VARCHAR(191) NOT NULL,
    `amount_cents` INTEGER NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'USD',
    `fee_rule_label` VARCHAR(50) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `platform_fees_creator_transaction_id_key`(`creator_transaction_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `refunds` (
    `id` VARCHAR(191) NOT NULL,
    `creator_transaction_id` VARCHAR(191) NULL,
    `payment_id` VARCHAR(191) NULL,
    `stripe_refund_id` VARCHAR(191) NOT NULL,
    `stripe_charge_id` VARCHAR(191) NULL,
    `amount_cents` INTEGER NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'USD',
    `status` ENUM('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELED') NOT NULL DEFAULT 'PENDING',
    `reason` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `refunds_stripe_refund_id_key`(`stripe_refund_id`),
    INDEX `refunds_payment_id_idx`(`payment_id`),
    INDEX `refunds_stripe_charge_id_idx`(`stripe_charge_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `disputes` (
    `id` VARCHAR(191) NOT NULL,
    `creator_transaction_id` VARCHAR(191) NULL,
    `stripe_dispute_id` VARCHAR(191) NOT NULL,
    `stripe_charge_id` VARCHAR(191) NOT NULL,
    `amount_cents` INTEGER NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'USD',
    `status` ENUM('WARNING_NEEDS_RESPONSE', 'WARNING_UNDER_REVIEW', 'WARNING_CLOSED', 'NEEDS_RESPONSE', 'UNDER_REVIEW', 'WON', 'LOST') NOT NULL DEFAULT 'NEEDS_RESPONSE',
    `reason` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `closed_at` DATETIME(3) NULL,

    UNIQUE INDEX `disputes_stripe_dispute_id_key`(`stripe_dispute_id`),
    INDEX `disputes_stripe_charge_id_idx`(`stripe_charge_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `creator_payouts` (
    `id` VARCHAR(191) NOT NULL,
    `creator_profile_id` VARCHAR(191) NOT NULL,
    `stripe_payout_id` VARCHAR(191) NOT NULL,
    `amount_cents` INTEGER NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'USD',
    `status` ENUM('PENDING', 'IN_TRANSIT', 'PAID', 'FAILED', 'CANCELED') NOT NULL DEFAULT 'PENDING',
    `arrival_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `creator_payouts_stripe_payout_id_key`(`stripe_payout_id`),
    INDEX `creator_payouts_creator_profile_id_created_at_idx`(`creator_profile_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `creator_transactions` ADD CONSTRAINT `creator_transactions_creator_profile_id_fkey` FOREIGN KEY (`creator_profile_id`) REFERENCES `creator_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `creator_transactions` ADD CONSTRAINT `creator_transactions_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `creator_transactions` ADD CONSTRAINT `creator_transactions_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `platform_fees` ADD CONSTRAINT `platform_fees_creator_transaction_id_fkey` FOREIGN KEY (`creator_transaction_id`) REFERENCES `creator_transactions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `refunds` ADD CONSTRAINT `refunds_creator_transaction_id_fkey` FOREIGN KEY (`creator_transaction_id`) REFERENCES `creator_transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `disputes` ADD CONSTRAINT `disputes_creator_transaction_id_fkey` FOREIGN KEY (`creator_transaction_id`) REFERENCES `creator_transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `creator_payouts` ADD CONSTRAINT `creator_payouts_creator_profile_id_fkey` FOREIGN KEY (`creator_profile_id`) REFERENCES `creator_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
