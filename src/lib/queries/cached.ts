import { cache } from "react";
import type { Competition } from "@/lib/constants";
import { getActiveGroup, getUserEntries } from "@/lib/queries/groups";
import {
  getCurrentRoundBoard,
  getPredictionRoundBoard,
  getResultsRoundBoard,
} from "@/lib/queries/round-board";
import { getSession } from "@/lib/session";

/** Dedupe auth/group reads within a single request (layout + page). */
export const getCachedSession = cache(getSession);

export const getCachedActiveGroup = cache((userId: string) =>
  getActiveGroup(userId),
);

export const getCachedRoundBoard = cache((competition: Competition) =>
  getCurrentRoundBoard(competition),
);

export const getCachedResultsRoundBoard = cache(
  (competition: Competition, roundId?: string) =>
    getResultsRoundBoard(competition, roundId),
);

export const getCachedPredictionRoundBoard = cache((competition: Competition) =>
  getPredictionRoundBoard(competition),
);

export const getCachedUserEntries = cache(
  (userId: string, groupId: string, roundId: string) =>
    getUserEntries(userId, groupId, roundId),
);
