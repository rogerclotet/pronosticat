import { cache } from "react";
import { getSession } from "@/lib/session";
import { getActiveGroup, getUserEntries } from "@/lib/queries/groups";
import { getCurrentRoundBoard } from "@/lib/queries/round-board";
import type { Competition } from "@/lib/constants";

/** Dedupe auth/group reads within a single request (layout + page). */
export const getCachedSession = cache(getSession);

export const getCachedActiveGroup = cache((userId: string) =>
  getActiveGroup(userId),
);

export const getCachedRoundBoard = cache((competition: Competition) =>
  getCurrentRoundBoard(competition),
);

export const getCachedUserEntries = cache(
  (userId: string, groupId: string, roundId: string) =>
    getUserEntries(userId, groupId, roundId),
);
