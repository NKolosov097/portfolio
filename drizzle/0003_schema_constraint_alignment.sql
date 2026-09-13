DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_notification_attempts_check'
  ) THEN
    ALTER TABLE "messages" ADD CONSTRAINT "messages_notification_attempts_check"
      CHECK ("notification_attempts" BETWEEN 0 AND 5);
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_notification_error_code_check'
  ) THEN
    ALTER TABLE "messages" ADD CONSTRAINT "messages_notification_error_code_check"
      CHECK ("notification_error_code" IS NULL OR "notification_error_code" IN ('configuration', 'rejected', 'timeout', 'transport_failed'));
  END IF;
END $$;
