import { cache } from "react";
import { getSession } from "@/lib/session";
import {
  getActiveGroup,
  getMemberPoints,
  getUserPredictions,
} from "@/lib/actions/groups";

/** Dedupe auth/group reads within a single request (layout + page). */
export const getCachedSession = cache(getSession);

export const getCachedActiveGroup = cache((userId: string) =>
  getActiveGroup(userId),
);

export const getCachedMemberPoints = cache((userId: string, groupId: string) =>
  getMemberPoints(userId, groupId),
);

export const getCachedUserPredictions = cache(
  (userId: string, groupId: string, matchIds: string[]) =>
    getUserPredictions(userId, groupId, matchIds),
);
