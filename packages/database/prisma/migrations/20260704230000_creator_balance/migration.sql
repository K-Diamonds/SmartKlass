ALTER TABLE `creator_profiles`
  ADD COLUMN `available_balance_cents` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `withdrawn_balance_cents` INTEGER NOT NULL DEFAULT 0;
