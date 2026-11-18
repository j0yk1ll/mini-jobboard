CREATE TYPE "public"."bewerbungsstatus" AS ENUM('neu', 'eingeladen', 'abgelehnt');--> statement-breakpoint
CREATE TABLE "bewerbung" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stellenanzeige_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"text" text NOT NULL,
	"status" "bewerbungsstatus" DEFAULT 'neu' NOT NULL,
	CONSTRAINT "bewerbung_stellenanzeige_email_unique" UNIQUE("stellenanzeige_id","email"),
	CONSTRAINT "bewerbung_email_normalized" CHECK ("bewerbung"."email" = lower("bewerbung"."email" COLLATE "C")
        AND "bewerbung"."email" COLLATE "C" !~ '[^!-~]')
);
--> statement-breakpoint
ALTER TABLE "bewerbung" ADD CONSTRAINT "bewerbung_stellenanzeige_id_stellenanzeige_id_fk" FOREIGN KEY ("stellenanzeige_id") REFERENCES "public"."stellenanzeige"("id") ON DELETE no action ON UPDATE no action;