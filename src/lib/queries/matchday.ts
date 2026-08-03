import { and, eq, inArray, min } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches } from "@/lib/db/schema";
import type { Competition } from "@/lib/constants";

/** Derive current matchday from synced DB rows (no external API call). */
export async function getCurrentMatchdayFromDb(
  competition: Competition,
): Promise<number> {
  const [row] = await db
    .select({ matchday: min(matches.matchday) })
    .from(matches)
    .where(
      and(
        eq(matches.competition, competition),
        inArray(matches.status, ["scheduled", "live"]),
      ),
    );

  return row?.matchday ?? 1;
}
