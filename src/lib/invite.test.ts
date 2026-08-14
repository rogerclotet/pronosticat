import { describe, expect, it } from "vitest";
import {
  inviteJoinPath,
  invitePath,
  loginWithInvitePath,
  normalizeInviteCode,
  sanitizeAuthCallbackUrl,
} from "./invite";

describe("normalizeInviteCode", () => {
  it("uppercases and accepts a generated-length code", () => {
    expect(normalizeInviteCode(" ab2defgh ")).toBe("AB2DEFGH");
  });

  it("rejects ambiguous or short values", () => {
    expect(normalizeInviteCode("ABC")).toBeNull();
    expect(normalizeInviteCode("ABC10DEF")).toBeNull();
    expect(normalizeInviteCode("../login")).toBeNull();
  });
});

describe("invite paths", () => {
  it("builds the public invite URL pieces", () => {
    expect(invitePath("AB2DEFGH")).toBe("/invite/AB2DEFGH");
    expect(inviteJoinPath("AB2DEFGH")).toBe("/invite/AB2DEFGH?join=1");
    expect(loginWithInvitePath("AB2DEFGH")).toBe(
      "/login?next=%2Finvite%2FAB2DEFGH%3Fjoin%3D1",
    );
  });
});

describe("sanitizeAuthCallbackUrl", () => {
  it("reconstructs a join continuation", () => {
    expect(sanitizeAuthCallbackUrl("/invite/ab2defgh?join=1")).toBe(
      "/invite/AB2DEFGH?join=1",
    );
  });

  it("allows the invite page without join", () => {
    expect(sanitizeAuthCallbackUrl("/invite/AB2DEFGH")).toBe("/invite/AB2DEFGH");
  });

  it("rejects open redirects and unrelated paths", () => {
    expect(sanitizeAuthCallbackUrl("https://evil.example/invite/AB2DEFGH")).toBeNull();
    expect(sanitizeAuthCallbackUrl("//evil.example")).toBeNull();
    expect(sanitizeAuthCallbackUrl("/login")).toBeNull();
    expect(sanitizeAuthCallbackUrl("/invite/AB2DEFGH?join=1&x=1")).toBeNull();
    expect(sanitizeAuthCallbackUrl("/invite/AB2DEFGH/../../login")).toBeNull();
    expect(sanitizeAuthCallbackUrl("/invite/%2e%2e/login")).toBeNull();
  });
});
