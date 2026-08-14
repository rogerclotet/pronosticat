import { bearerMatchesSecret } from "@/lib/security/timing-safe";

/**
 * The HTML admin and server actions are development-only.
 * Production break-glass is the /api/dev/* routes, and only when a secret is set.
 */
export function isDevFixturesUiEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

export function isDevFixturesEnabled(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  const secret = process.env.DEV_FIXTURES_SECRET ?? process.env.CRON_SECRET;
  return process.env.DEV_FIXTURES_ENABLED === "true" && Boolean(secret);
}

export function checkDevFixturesAuth(request: Request): boolean {
  const secret = process.env.DEV_FIXTURES_SECRET ?? process.env.CRON_SECRET;
  if (process.env.NODE_ENV === "development" && !secret) return true;
  if (!secret) return false;
  return bearerMatchesSecret(request.headers.get("authorization"), secret);
}

export function devFixturesDisabledResponse() {
  return Response.json({ error: "Dev fixtures are disabled" }, { status: 404 });
}

export function devFixturesUnauthorizedResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
