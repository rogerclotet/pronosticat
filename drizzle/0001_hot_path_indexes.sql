CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "group_members_user_idx" ON "group_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "matches_competition_matchday_idx" ON "matches" USING btree ("competition","matchday");--> statement-breakpoint
CREATE INDEX "matches_competition_status_idx" ON "matches" USING btree ("competition","status");--> statement-breakpoint
CREATE INDEX "rounds_competition_status_idx" ON "rounds" USING btree ("competition","status");--> statement-breakpoint
CREATE INDEX "entries_user_group_round_idx" ON "entries" USING btree ("user_id","group_id","round_id");
