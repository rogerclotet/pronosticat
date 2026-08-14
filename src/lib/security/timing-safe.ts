import { createHash, timingSafeEqual } from "node:crypto";

/** Constant-time string compare so secret length/content is not leaked via timing. */
export function timingSafeEqualString(a: string, b: string): boolean {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}

export function bearerMatchesSecret(
  authorizationHeader: string | null,
  secret: string,
): boolean {
  return timingSafeEqualString(authorizationHeader ?? "", `Bearer ${secret}`);
}
