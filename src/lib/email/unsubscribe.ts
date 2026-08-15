import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * An unsubscribe link has to work from an inbox, with no session and no
 * cookies, so the user id travels in the URL with an HMAC over it. The token
 * proves we minted the link; it grants nothing but turning email off.
 */
function secret(): string {
  const value = process.env.BETTER_AUTH_SECRET?.trim();
  if (!value) throw new Error("BETTER_AUTH_SECRET is not configured");
  return value;
}

export function signUnsubscribe(userId: string): string {
  return createHmac("sha256", secret())
    .update(`unsubscribe:${userId}`)
    .digest("base64url");
}

export function verifyUnsubscribe(userId: string, token: string): boolean {
  if (!userId || !token) return false;
  const expected = Buffer.from(signUnsubscribe(userId));
  const given = Buffer.from(token);
  if (expected.length !== given.length) return false;
  return timingSafeEqual(expected, given);
}

export function unsubscribeUrl(userId: string, baseUrl: string): string {
  const url = new URL("/api/email/unsubscribe", baseUrl);
  url.searchParams.set("u", userId);
  url.searchParams.set("t", signUnsubscribe(userId));
  return url.toString();
}
