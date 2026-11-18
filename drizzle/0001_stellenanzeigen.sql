CREATE TYPE "public"."stellenanzeigen_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TABLE "stellenanzeige" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recruiter_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" "stellenanzeigen_status" DEFAULT 'open' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stellenanzeige" ADD CONSTRAINT "stellenanzeige_recruiter_id_user_id_fk" FOREIGN KEY ("recruiter_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stellenanzeige_recruiter_id_idx" ON "stellenanzeige" USING btree ("recruiter_id");