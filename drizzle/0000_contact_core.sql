CREATE TYPE "contact_notification_state" AS ENUM ('pending', 'sending', 'sent', 'failed');

CREATE TABLE "users" (
  "id" serial PRIMARY KEY,
  "name" varchar(100) NOT NULL,
  "email" varchar(254) NOT NULL,
  "company" varchar(150) NOT NULL DEFAULT '',
  "profession" varchar(150) NOT NULL DEFAULT '',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "users_email_unique" ON "users" ("email");

CREATE TABLE "contact_submission_keys" (
  "submission_id" uuid PRIMARY KEY,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "messages" (
  "id" serial PRIMARY KEY,
  "submission_id" uuid NOT NULL REFERENCES "contact_submission_keys" ("submission_id"),
  "author_id" integer NOT NULL REFERENCES "users" ("id"),
  "name" varchar(100) NOT NULL,
  "email" varchar(254) NOT NULL,
  "company" varchar(150) NOT NULL DEFAULT '',
  "profession" varchar(150) NOT NULL DEFAULT '',
  "content" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "notification_state" contact_notification_state NOT NULL DEFAULT 'pending',
  "notification_attempts" integer NOT NULL DEFAULT 0,
  "notification_next_attempt_at" timestamptz NOT NULL DEFAULT now(),
  "notification_lease_until" timestamptz,
  "notification_claim_token" uuid,
  "notification_sent_at" timestamptz,
  "notification_error_code" varchar(32),
  CONSTRAINT "messages_name_length_check" CHECK (char_length("name") BETWEEN 1 AND 100),
  CONSTRAINT "messages_content_length_check" CHECK (char_length("content") BETWEEN 6 AND 5000),
  CONSTRAINT "messages_notification_attempts_check" CHECK ("notification_attempts" BETWEEN 0 AND 5),
  CONSTRAINT "messages_notification_error_code_check" CHECK ("notification_error_code" IS NULL OR "notification_error_code" IN ('configuration', 'rejected', 'timeout', 'transport_failed'))
);
CREATE UNIQUE INDEX "messages_submission_id_unique" ON "messages" ("submission_id");
CREATE INDEX "messages_notification_due_idx" ON "messages" ("notification_state", "notification_next_attempt_at");

CREATE TABLE "contact_rate_limits" (
  "scope" varchar(16) NOT NULL,
  "value_hash" varchar(64) NOT NULL,
  "count" integer NOT NULL,
  "expires_at" timestamptz NOT NULL,
  PRIMARY KEY ("scope", "value_hash"),
  CONSTRAINT "contact_rate_limits_count_check" CHECK ("count" > 0)
);
CREATE INDEX "contact_rate_limits_expires_idx" ON "contact_rate_limits" ("expires_at");
