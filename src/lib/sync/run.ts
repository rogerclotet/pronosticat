import { revalidateTag } from "next/cache";
import type { Competition } from "@/lib/constants";
import { FootballDataRateLimitError } from "@/lib/football/api";
import { getActiveCompetitions } from "@/lib/queries/active-competitions";
import { ensureCompetitionRounds } from "@/lib/rounds/ensure";
import { syncMatchesToDb } from "@/lib/sync/matches";

export async function syncMatches(competition: Competition) {
  try {
    await syncMatchesToDb(competition);
    await ensureCompetitionRounds(competition);
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
