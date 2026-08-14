import { describe, expect, it } from "vitest";
import { EXTRA_CHALLENGE_SLUGS } from "@/lib/challenges/registry";
import {
  boardChallengeSlugs,
  pickRotatingChallenge,
} from "@/lib/challenges/rotating";

describe("pickRotatingChallenge", () => {
  it("returns a slug from the rotating pool", () => {
    const slug = pickRotatingChallenge("laliga-7");
    expect(EXTRA_CHALLENGE_SLUGS).toContain(slug);
  });

  it("is stable for the same round", () => {
    expect(pickRotatingChallenge("laliga-7")).toBe(
      pickRotatingChallenge("laliga-7"),
    );
  });

  it("can differ across rounds", () => {
    const picks = new Set(
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((md) =>
        pickRotatingChallenge(`laliga-${md}`),
      ),
    );
    expect(picks.size).toBeGreaterThan(1);
  });
});

describe("boardChallengeSlugs", () => {
  it("adds a rotating slug when none exists yet", () => {
    const slugs = boardChallengeSlugs("laliga-3", new Set());
    expect(slugs).toHaveLength(6);
    expect(slugs.slice(0, 5)).toEqual([
      "exact_score",
      "goal_fest",
      "thrashing",
      "goal_machine",
      "banker",
    ]);
    expect(EXTRA_CHALLENGE_SLUGS).toContain(slugs[5]);
  });

  it("keeps an existing rotating slug instead of replacing it", () => {
    const existing = new Set([
      "exact_score",
      "goal_fest",
      "thrashing",
      "goal_machine",
      "banker",
      "btts",
    ]);
    expect(boardChallengeSlugs("laliga-3", existing)).toEqual([
      "exact_score",
      "goal_fest",
      "thrashing",
      "goal_machine",
      "banker",
      "btts",
    ]);
  });
});
