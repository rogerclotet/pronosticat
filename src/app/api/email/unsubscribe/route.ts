import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notificationPrefs } from "@/lib/db/schema";
import { verifyUnsubscribe } from "@/lib/email/unsubscribe";

/**
 * Reached from an inbox, so there is no session: the signed token in the link
 * is the only credential, and all it can do is turn this user's email off.
 */
function readToken(request: Request): string | null {
  const url = new URL(request.url);
  const userId = url.searchParams.get("u") ?? "";
  const token = url.searchParams.get("t") ?? "";
  return verifyUnsubscribe(userId, token) ? userId : null;
}

async function optOut(userId: string) {
  await db
    .insert(notificationPrefs)
    .values({ userId, emailEnabled: false })
    .onConflictDoUpdate({
      target: notificationPrefs.userId,
      set: { emailEnabled: false, updatedAt: new Date() },
    });
}

function page(body: string, status: number) {
  return new NextResponse(
    `<!doctype html><html lang="ca"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pronosticat</title></head>
<body style="margin:0;padding:48px 24px;background:#0f1115;color:#e8ebf0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;text-align:center;">
${body}</body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

/**
 * Confirms rather than acting: inbox link scanners follow every GET in a
 * message, and a bare GET here would unsubscribe people who never clicked.
 */
export async function GET(request: Request) {
  const userId = readToken(request);
  if (!userId) return page("<p>Aquest enllaç no és vàlid.</p>", 400);

  const url = new URL(request.url);
  return page(
    `<form method="post" action="${url.pathname}${url.search}">
  <p style="font-size:16px;">Vols deixar de rebre correus de Pronosticat?</p>
  <button type="submit" style="margin-top:16px;background:#4ecdc4;color:#0f1115;border:0;padding:12px 20px;font-weight:bold;font-size:15px;cursor:pointer;">
    Sí, dona'm de baixa
  </button>
</form>`,
    200,
  );
}

/** Also the RFC 8058 one-click target: clients POST here directly. */
export async function POST(request: Request) {
  const userId = readToken(request);
  if (!userId) {
    return page("<p>Aquest enllaç no és vàlid.</p>", 400);
  }

  await optOut(userId);
  return page(
    '<p>Fet. Ja no rebràs més correus de Pronosticat.</p><p style="font-size:13px;color:#8b93a7;">Ho pots tornar a activar al teu perfil.</p>',
    200,
  );
}

/** An unsubscribe link must never be cached into a no-op. */
export const dynamic = "force-dynamic";
