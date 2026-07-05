-- Add weekly subscription billing interval
ALTER TABLE `access_plans` MODIFY `billing_interval` ENUM('WEEKLY', 'MONTHLY', 'YEARLY') NULL;
