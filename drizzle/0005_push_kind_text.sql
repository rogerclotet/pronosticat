ALTER TABLE "push_dispatches" ALTER COLUMN "kind" SET DATA TYPE text USING "kind"::text;--> statement-breakpoint
DROP TYPE "public"."push_kind";