import { describe, expect, it } from "vitest";
import { bearerMatchesSecret, timingSafeEqualString } from "./timing-safe";

describe("timingSafeEqualString", () => {
  it("accepts identical strings", () => {
    expect(timingSafeEqualString("secret", "secret")).toBe(true);
  });

  it("rejects different strings of the same length", () => {
    expect(timingSafeEqualString("secret", "secr3t")).toBe(false);
  });

  it("rejects different lengths without throwing", () => {
    expect(timingSafeEqualString("ab", "abcdef")).toBe(false);
    expect(timingSafeEqualString("", "x")).toBe(false);
  });
});

describe("bearerMatchesSecret", () => {
  it("accepts a matching Bearer token", () => {
    expect(bearerMatchesSecret("Bearer hunter2", "hunter2")).toBe(true);
  });

  it("rejects a missing or wrong header", () => {
    expect(bearerMatchesSecret(null, "hunter2")).toBe(false);
    expect(bearerMatchesSecret("Bearer nope", "hunter2")).toBe(false);
    expect(bearerMatchesSecret("hunter2", "hunter2")).toBe(false);
  });
});
