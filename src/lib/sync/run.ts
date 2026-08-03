import { FootballDataRateLimitError } from "@/lib/football/api";
import { syncMatchesToDb } from "@/lib/sync/matches";
import { getActiveCompetitions } from "@/lib/queries/active-competitions";
import type { Competition } from "@/lib/constants";
import { revalidateTag } from "next/cache";

export async function syncMatches(competition: Competition) {
  try {
    await syncMatchesToDb(competition);
    revalidateTag("matches", "max");
  } catch (error) {
    if (error instanceof FootballDataRateLimitError) {
      console.warn(
        `[pronosticat] Skipping sync for ${competition} after rate limit`,
      );
      return;
    }
    throw error;
  }
}

export async function syncActiveCompetitions() {
  const competitions = await getActiveCompetitions();
  for (const competition of competitions) {
    await syncMatches(competition);
  }
}
