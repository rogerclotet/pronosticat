import { describe, expect, it } from "vitest";
import {
  deadlinePayload,
  exactScoreHitPayload,
  formatRemaining,
  jokerUnusedPayload,
  matchFinishedPayload,
  roundSettledPayload,
  streakPayload,
} from "./payload";

describe("formatRemaining", () => {
  it("uses minutes under an hour", () => {
    expect(formatRemaining(5 * 60_000)).toBe("5 minuts");
    expect(formatRemaining(60_000)).toBe("1 minut");
  });

  it("uses hours at and above 60 minutes", () => {
    expect(formatRemaining(60 * 60_000)).toBe("1 hora");
    expect(formatRemaining(3 * 60 * 60_000)).toBe("3 hores");
  });
});

describe("payloads", () => {
  it("mentions leftover slots on a deadline reminder", () => {
    const payload = deadlinePayload({
      missingSlots: 3,
      remainingMs: 50 * 60_000,
      competitionLabel: "LaLiga",
    });
    expect(payload.body).toBe(
      "Et queden 3 caselles i LaLiga tanca d'aquí 50 minuts.",
    );
    expect(payload.url).toBe("/");
  });

  it("uses the singular when one slot is empty", () => {
    const payload = deadlinePayload({
      missingSlots: 1,
      remainingMs: 60_000,
      competitionLabel: "LaLiga",
    });
    expect(payload.body).toContain("1 casella");
  });

  it("includes the scoreline for a finished pick", () => {
    const payload = matchFinishedPayload({
      homeTeam: "Girona",
      awayTeam: "Elx",
      homeScore: 2,
      awayScore: 1,
      matchId: "m1",
    });
    expect(payload.body).toBe("Girona 2–1 Elx. Mira si has encertat.");
    expect(payload.url).toBe("/jornada");
  });

  it("signs the points delta on settlement", () => {
    expect(
      roundSettledPayload({
        matchday: 4,
        groupName: "Penya",
        points: 80,
        groupId: "g1",
      }).body,
    ).toBe("Penya · jornada 4 liquidada: +80 punts.");
    expect(
      roundSettledPayload({
        matchday: 4,
        groupName: "Penya",
        points: -25,
        groupId: "g1",
      }).body,
    ).toContain("-25");
  });

  it("calls out an unused joker near the deadline", () => {
    expect(
      jokerUnusedPayload({
        remainingMs: 50 * 60_000,
        competitionLabel: "LaLiga",
      }).body,
    ).toContain("jòquer");
  });

  it("celebrates an exact porra, and the joker variant", () => {
    expect(
      exactScoreHitPayload({
        homeTeam: "Girona",
        awayTeam: "Elx",
        homeScore: 2,
        awayScore: 1,
        isJoker: false,
        matchId: "m1",
      }).body,
    ).toBe("Has clavat la porra! Girona 2–1 Elx.");
    expect(
      exactScoreHitPayload({
        homeTeam: "Girona",
        awayTeam: "Elx",
        homeScore: 2,
        awayScore: 1,
        isJoker: true,
        matchId: "m1",
      }).body,
    ).toContain("jòquer");
  });

  it("reports a broken streak", () => {
    expect(
      streakPayload({
        groupName: "Penya",
        groupId: "g1",
        roundId: "laliga-4",
        streak: 3,
        broke: true,
      }).body,
    ).toBe("S'ha trencat la ratxa de 3 a Penya.");
  });
});
