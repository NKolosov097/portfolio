CREATE TABLE "contact_notification_jobs" (
	"job_name" varchar(64) PRIMARY KEY NOT NULL,
	"lease_token" uuid,
	"lease_until" timestamp with time zone,
	"last_started_at" timestamp with time zone,
	"last_completed_at" timestamp with time zone,
	"last_status" varchar(32),
	"last_claimed" integer DEFAULT 0 NOT NULL,
	"last_sent" integer DEFAULT 0 NOT NULL,
	"last_requeued" integer DEFAULT 0 NOT NULL,
	"last_lost_lease" integer DEFAULT 0 NOT NULL
);
