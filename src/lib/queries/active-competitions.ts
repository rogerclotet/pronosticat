import type { Competition } from "@/lib/constants";
import { db } from "@/lib/db";
import { groups } from "@/lib/db/schema";
import { liveGroup } from "@/lib/queries/groups";

/** Competitions referenced by at least one group (used to scope cron sync). */
export async function getActiveCompetitions(): Promise<Competition[]> {
  const rows = await db
    .selectDistinct({ competition: groups.competition })
    .from(groups)
    .where(liveGroup);
  return rows.map((row) => row.competition);
}
