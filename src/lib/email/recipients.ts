import "server-only";

import { eq, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { notificationPrefs, user } from "@/lib/db/schema";

export type EmailRecipient = { userId: string; email: string; name: string };

/**
 * Everyone who has not opted out of email. A missing prefs row counts as
 * opted in. Callers exclude anyone push can already reach — email is a
 * fallback, not a second channel.
 */
export async function emailOptedInUsers(): Promise<
  Map<string, EmailRecipient>
> {
  const rows = await db
    .select({ userId: user.id, email: user.email, name: user.name })
    .from(user)
    .leftJoin(notificationPrefs, eq(notificationPrefs.userId, user.id))
    .where(
      or(
        isNull(notificationPrefs.userId),
        eq(notificationPrefs.emailEnabled, true),
      ),
    );

  return new Map(rows.map((row) => [row.userId, row]));
}

export async function isEmailEnabledFor(userId: string): Promise<boolean> {
  const row = await db.query.notificationPrefs.findFirst({
    where: eq(notificationPrefs.userId, userId),
    columns: { emailEnabled: true },
  });
  return row?.emailEnabled ?? true;
}
