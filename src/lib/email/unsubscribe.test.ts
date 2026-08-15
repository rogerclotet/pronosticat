import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.BETTER_AUTH_SECRET = "test-secret-at-least-32-characters-xx";
});

const { signUnsubscribe, unsubscribeUrl, verifyUnsubscribe } = await import(
  "./unsubscribe"
);

describe("unsubscribe tokens", () => {
  it("accepts the token it minted", () => {
    const token = signUnsubscribe("user-1");
    expect(verifyUnsubscribe("user-1", token)).toBe(true);
  });

  it("rejects another user's token, so the link cannot be retargeted", () => {
    const token = signUnsubscribe("user-1");
    expect(verifyUnsubscribe("user-2", token)).toBe(false);
  });

  it("rejects a tampered or empty token", () => {
    const token = signUnsubscribe("user-1");
    expect(verifyUnsubscribe("user-1", `${token}x`)).toBe(false);
    expect(verifyUnsubscribe("user-1", "")).toBe(false);
    expect(verifyUnsubscribe("", token)).toBe(false);
  });

  it("builds a link carrying both the id and its signature", () => {
    const url = new URL(unsubscribeUrl("user-1", "https://example.com"));
    expect(url.pathname).toBe("/api/email/unsubscribe");
    expect(url.searchParams.get("u")).toBe("user-1");
    expect(verifyUnsubscribe("user-1", url.searchParams.get("t") ?? "")).toBe(
      true,
    );
  });
});
