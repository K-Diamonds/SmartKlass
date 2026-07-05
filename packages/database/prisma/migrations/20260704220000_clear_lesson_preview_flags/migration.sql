-- Lesson-level free preview is no longer used; course trailer is the preview path.
UPDATE `lessons` SET `is_preview` = false WHERE `is_preview` = true;
