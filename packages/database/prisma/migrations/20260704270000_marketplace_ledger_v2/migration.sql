-- Upgrade marketplace accounting to audit-safe ledger schema

DROP TABLE IF EXISTS `platform_fees`;

ALTER TABLE `creator_transactions`
  CHANGE COLUMN `creator_earnings_cents` `creator_net_cents` INTEGER NOT NULL,
  ADD COLUMN `stripe_fee_cents` INTEGER NULL AFTER `platform_fee_cents`,
  ADD COLUMN `stripe_balance_transaction_id` VARCHAR(191) NULL AFTER `stripe_charge_id`,
  ADD COLUMN `paid_out_at` DATETIME(3) NULL AFTER `available_at`,
  ADD COLUMN `metadata` JSON NULL AFTER `paid_out_at`,
  MODIFY COLUMN `status` ENUM('PENDING', 'AVAILABLE', 'PAID_OUT', 'REFUNDED', 'DISPUTED', 'REVERSED') NOT NULL DEFAULT 'PENDING';

CREATE INDEX `creator_transactions_creator_profile_id_status_idx` ON `creator_transactions`(`creator_profile_id`, `status`);
CREATE INDEX `creator_transactions_available_at_idx` ON `creator_transactions`(`available_at`);

ALTER TABLE `disputes`
  ADD COLUMN `payment_id` VARCHAR(191) NULL AFTER `id`,
  ADD INDEX `disputes_payment_id_idx`(`payment_id`),
  ADD CONSTRAINT `disputes_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `creator_payouts`
  CHANGE COLUMN `arrival_date` `scheduled_for` DATETIME(3) NULL,
  ADD COLUMN `paid_at` DATETIME(3) NULL AFTER `scheduled_for`,
  ADD COLUMN `failure_reason` VARCHAR(500) NULL AFTER `paid_at`,
  ADD COLUMN `metadata` JSON NULL AFTER `failure_reason`,
  MODIFY COLUMN `status` ENUM('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELED') NOT NULL DEFAULT 'PENDING';

CREATE INDEX `creator_payouts_status_idx` ON `creator_payouts`(`status`);

CREATE INDEX `refunds_creator_transaction_id_idx` ON `refunds`(`creator_transaction_id`);
