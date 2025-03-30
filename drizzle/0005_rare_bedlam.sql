CREATE TABLE "poll_acknowledgement" (
	"id" text PRIMARY KEY NOT NULL,
	"poll_id" text NOT NULL,
	"user_id" text NOT NULL,
	"session_id" text NOT NULL,
	"acknowledged_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "poll_acknowledgement" ADD CONSTRAINT "poll_acknowledgement_poll_id_poll_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."poll"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_acknowledgement" ADD CONSTRAINT "poll_acknowledgement_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_acknowledgement" ADD CONSTRAINT "poll_acknowledgement_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id") ON DELETE cascade ON UPDATE no action;