-- AlterTable
ALTER TABLE `lessons` MODIFY `youtube_video_id` VARCHAR(20) NULL,
    MODIFY `youtube_url` VARCHAR(500) NULL,
    ADD COLUMN `thumbnail_url` VARCHAR(500) NULL,
    ADD COLUMN `provider` ENUM('YOUTUBE') NULL DEFAULT 'YOUTUBE';
