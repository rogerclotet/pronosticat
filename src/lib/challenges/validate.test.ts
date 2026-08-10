import { describe, expect, it } from "vitest";
import { normalizeTarget } from "./validate";
import { MAX_PREDICTED_SCORE } from "@/lib/constants";

describe("normalizeTarget", () => {
  it("keeps only the match for a match challenge", () => {
    expect(
      normalizeTarget("match", { targetMatchId: "a", targetSide: "home" }),
    ).toEqual({
      targetMatchId: "a",
      targetSide: null,
      predictedHome: null,
      predictedAway: null,
      numericValue: null,
    });
  });

  it("keeps match and side for a team challenge", () => {
    expect(
      normalizeTarget("team", {
        targetMatchId: "a",
        targetSide: "away",
        numericValue: 7,
      }),
    ).toMatchObject({
      targetMatchId: "a",
      targetSide: "away",
      numericValue: null,
    });
  });

  it("keeps match and scoreline for a match_score challenge", () => {
    expect(
      normalizeTarget("match_score", {
        targetMatchId: "a",
        predictedHome: 2,
        predictedAway: 0,
      }),
    ).toMatchObject({ targetMatchId: "a", predictedHome: 2, predictedAway: 0 });
  });

  it("rejects a missing match", () => {
    expect(() => normalizeTarget("match", {})).toThrow("Pick a match");
  });

  it("rejects a team pick with no side", () => {
    expect(() => normalizeTarget("team", { targetMatchId: "a" })).toThrow(
      "Pick a team",
    );
  });

  it("rejects a negative or absurd scoreline", () => {
    const base = { targetMatchId: "a", predictedAway: 0 };
    expect(() =>
      normalizeTarget("match_score", { ...base, predictedHome: -1 }),
    ).toThrow("out of range");
    expect(() =>
      normalizeTarget("match_score", {
        ...base,
        predictedHome: MAX_PREDICTED_SCORE + 1,
      }),
    ).toThrow("out of range");
  });

  it("rejects a non-integer scoreline", () => {
    expect(() =>
      normalizeTarget("match_score", {
        targetMatchId: "a",
        predictedHome: 1.5,
        predictedAway: 0,
      }),
    ).toThrow("Pick a scoreline");
  });

  it("keeps only the number for a number challenge", () => {
    expect(
      normalizeTarget("number", { numericValue: 24, targetMatchId: "a" }),
    ).toMatchObject({ numericValue: 24, targetMatchId: null });
  });

  it("rejects a missing number", () => {
    expect(() => normalizeTarget("number", {})).toThrow("Pick a number");
  });
});
