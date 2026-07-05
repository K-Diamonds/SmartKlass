ALTER TABLE `creator_profiles`
  ADD COLUMN `stripe_connect_account_id` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `creator_profiles_stripe_connect_account_id_key`
  ON `creator_profiles`(`stripe_connect_account_id`);
