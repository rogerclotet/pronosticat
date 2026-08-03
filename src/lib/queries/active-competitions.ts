import { db } from "@/lib/db";
import { groups } from "@/lib/db/schema";
import type { Competition } from "@/lib/constants";

/** Competitions referenced by at least one group (used to scope cron sync). */
export async function getActiveCompetitions(): Promise<Competition[]> {
  const rows = await db.selectDistinct({ competition: groups.competition }).from(groups);
  return rows.map((row) => row.competition);
}
