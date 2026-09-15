CREATE TABLE "contact_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"position" integer NOT NULL,
	"blob_url" text NOT NULL,
	"pathname" text NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"content_type" varchar(32) NOT NULL,
	"byte_size" integer NOT NULL,
	"etag" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "contact_attachments_position_check" CHECK ("contact_attachments"."position" between 0 and 2),
	CONSTRAINT "contact_attachments_content_type_check" CHECK ("contact_attachments"."content_type" in ('application/pdf', 'image/jpeg', 'image/png')),
	CONSTRAINT "contact_attachments_byte_size_check" CHECK ("contact_attachments"."byte_size" between 1 and 5242880)
);
--> statement-breakpoint
ALTER TABLE "messages" DROP CONSTRAINT "messages_notification_error_code_check";--> statement-breakpoint
ALTER TABLE "contact_attachments" ADD CONSTRAINT "contact_attachments_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contact_attachments_message_position_unique" ON "contact_attachments" USING btree ("message_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_attachments_blob_url_unique" ON "contact_attachments" USING btree ("blob_url");--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_notification_error_code_check" CHECK ("messages"."notification_error_code" is null or "messages"."notification_error_code" in ('configuration', 'rejected', 'timeout', 'transport_failed', 'attachment_unavailable'));
