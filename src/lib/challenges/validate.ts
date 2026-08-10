import { MAX_PREDICTED_SCORE } from "@/lib/constants";
import type { ChallengeTargetKind, TargetSide } from "@/lib/challenges/types";

export type EntryInput = {
  targetMatchId?: string | null;
  targetSide?: TargetSide | null;
  predictedHome?: number | null;
  predictedAway?: number | null;
  numericValue?: number | null;
};

/** The columns an entry actually stores, with everything irrelevant nulled out. */
export type NormalizedTarget = {
  targetMatchId: string | null;
  targetSide: TargetSide | null;
  predictedHome: number | null;
  predictedAway: number | null;
  numericValue: number | null;
};

const EMPTY: NormalizedTarget = {
  targetMatchId: null,
  targetSide: null,
  predictedHome: null,
  predictedAway: null,
  numericValue: null,
};

function requireMatch(input: EntryInput): string {
  if (!input.targetMatchId) throw new Error("Pick a match");
  return input.targetMatchId;
}

function requireSide(input: EntryInput): TargetSide {
  if (input.targetSide !== "home" && input.targetSide !== "away") {
    throw new Error("Pick a team");
  }
  return input.targetSide;
}

function requireScore(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error("Pick a scoreline");
  }
  if (value < 0 || value > MAX_PREDICTED_SCORE) {
    throw new Error("Scoreline out of range");
  }
  return value;
}

/**
 * Shape-check a pick against its challenge and drop anything the challenge
 * doesn't use, so a crafted payload can't smuggle extra fields into storage.
 * Whether the match belongs to this round is checked separately, against the DB.
 */
export function normalizeTarget(
  kind: ChallengeTargetKind,
  input: EntryInput,
): NormalizedTarget {
  switch (kind) {
    case "match":
      return { ...EMPTY, targetMatchId: requireMatch(input) };

    case "team":
      return {
        ...EMPTY,
        targetMatchId: requireMatch(input),
        targetSide: requireSide(input),
      };

    case "match_score":
      return {
        ...EMPTY,
        targetMatchId: requireMatch(input),
        predictedHome: requireScore(input.predictedHome),
        predictedAway: requireScore(input.predictedAway),
      };

    case "number": {
      const value = input.numericValue;
      if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
        throw new Error("Pick a number");
      }
      return { ...EMPTY, numericValue: value };
    }
  }
}
