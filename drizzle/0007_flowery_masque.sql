-- Seasons: matchdays repeat every year, so (competition, matchday) stopped
-- identifying a round. Existing rows are backfilled from their own kickoff
-- using the same rule as seasonFromDate(): July onwards starts a new season.
ALTER TABLE "matches" ADD COLUMN "season" integer;--> statement-breakpoint
UPDATE "matches" SET "season" = CASE
  WHEN EXTRACT(MONTH FROM "kickoff") >= 7 THEN EXTRACT(YEAR FROM "kickoff")
  ELSE EXTRACT(YEAR FROM "kickoff") - 1
END;--> statement-breakpoint
ALTER TABLE "matches" ALTER COLUMN "season" SET NOT NULL;--> statement-breakpoint

-- lock_at is the round's first kickoff, so it dates the season the same way.
ALTER TABLE "rounds" ADD COLUMN "season" integer;--> statement-breakpoint
UPDATE "rounds" SET "season" = CASE
  WHEN EXTRACT(MONTH FROM "lock_at") >= 7 THEN EXTRACT(YEAR FROM "lock_at")
  ELSE EXTRACT(YEAR FROM "lock_at") - 1
END;--> statement-breakpoint
ALTER TABLE "rounds" ALTER COLUMN "season" SET NOT NULL;--> statement-breakpoint

DROP INDEX "matches_competition_matchday_idx";--> statement-breakpoint
DROP INDEX "rounds_competition_matchday_idx";--> statement-breakpoint
CREATE INDEX "matches_competition_season_matchday_idx" ON "matches" USING btree ("competition","season","matchday");--> statement-breakpoint
CREATE UNIQUE INDEX "rounds_competition_season_matchday_idx" ON "rounds" USING btree ("competition","season","matchday");
