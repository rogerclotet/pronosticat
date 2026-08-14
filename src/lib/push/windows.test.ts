import { describe, expect, it } from "vitest";
import {
  isMeaningfulDeadlineAdvance,
  isRoundOpenWindow,
  matchingDeadlineWindow,
} from "./windows";

describe("matchingDeadlineWindow", () => {
  const now = new Date("2026-08-14T12:00:00Z");

  it("returns 1h when the lock is within an hour", () => {
    expect(matchingDeadlineWindow(new Date("2026-08-14T12:45:00Z"), now)).toBe(
      "1h",
    );
  });

  it("returns 6h when the lock is further out but still today", () => {
    expect(matchingDeadlineWindow(new Date("2026-08-14T16:00:00Z"), now)).toBe(
      "6h",
    );
  });

  it("returns null when the lock is more than 6 hours away", () => {
    expect(
      matchingDeadlineWindow(new Date("2026-08-14T19:00:00Z"), now),
    ).toBeNull();
  });

  it("returns null once the round has locked", () => {
    expect(
      matchingDeadlineWindow(new Date("2026-08-14T11:59:00Z"), now),
    ).toBeNull();
  });
});

describe("isRoundOpenWindow", () => {
  const now = new Date("2026-08-14T12:00:00Z");

  it("is true a few days before lock, outside the 6h reminder", () => {
    expect(isRoundOpenWindow(new Date("2026-08-17T12:00:00Z"), now)).toBe(true);
  });

  it("is false inside the 6h deadline window", () => {
    expect(isRoundOpenWindow(new Date("2026-08-14T16:00:00Z"), now)).toBe(
      false,
    );
  });

  it("is false more than a week out", () => {
    expect(isRoundOpenWindow(new Date("2026-08-28T12:00:00Z"), now)).toBe(
      false,
    );
  });
});

describe("isMeaningfulDeadlineAdvance", () => {
  const previous = new Date("2026-08-14T18:00:00Z");

  it("ignores a 10 minute reshuffle", () => {
    expect(
      isMeaningfulDeadlineAdvance(previous, new Date("2026-08-14T17:50:00Z")),
    ).toBe(false);
  });

  it("counts a 45 minute advance", () => {
    expect(
      isMeaningfulDeadlineAdvance(previous, new Date("2026-08-14T17:15:00Z")),
    ).toBe(true);
  });
});
