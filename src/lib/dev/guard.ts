export function isDevFixturesEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.DEV_FIXTURES_ENABLED === "true"
  );
}

export function checkDevFixturesAuth(request: Request): boolean {
  const secret = process.env.DEV_FIXTURES_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV === "development";

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

export function devFixturesDisabledResponse() {
  return Response.json({ error: "Dev fixtures are disabled" }, { status: 404 });
}

export function devFixturesUnauthorizedResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
