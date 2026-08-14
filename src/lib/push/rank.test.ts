import { describe, expect, it } from "vitest";
import { rankShifts, titleRaceSnapshot } from "./rank";

const member = (userId: string, name: string, points: number) => ({
  userId,
  name,
  points,
});

describe("rankShifts", () => {
  it("names the player you overtook when you climb", () => {
    const before = [
      member("a", "Anna", 100),
      member("b", "Berta", 80),
      member("c", "Carme", 40),
    ];
    const after = [
      member("a", "Anna", 100),
      member("b", "Berta", 80),
      member("c", "Carme", 120),
    ];
    const carme = rankShifts(before, after).find((row) => row.userId === "c");
    expect(carme?.newRank).toBe(1);
    expect(carme?.isFirst).toBe(true);
    expect(carme?.overtookName).toBe("Anna");
  });

  it("names who passed you when you drop", () => {
    const before = [member("a", "Anna", 100), member("b", "Berta", 80)];
    const after = [member("a", "Anna", 100), member("b", "Berta", 140)];
    const anna = rankShifts(before, after).find((row) => row.userId === "a");
    expect(anna?.newRank).toBe(2);
    expect(anna?.overtakenByName).toBe("Berta");
  });

  it("skips anyone whose rank did not move", () => {
    const standing = [member("a", "Anna", 100), member("b", "Berta", 80)];
    expect(rankShifts(standing, standing)).toEqual([]);
  });
});

describe("titleRaceSnapshot", () => {
  it("returns the gap from first to second", () => {
    const snap = titleRaceSnapshot([
      member("a", "Anna", 200),
      member("b", "Berta", 150),
      member("c", "Carme", 10),
    ]);
    expect(snap).toEqual({
      leader: member("a", "Anna", 200),
      second: member("b", "Berta", 150),
      gap: 50,
    });
  });

  it("needs two players", () => {
    expect(titleRaceSnapshot([member("a", "Anna", 10)])).toBeNull();
  });
});
