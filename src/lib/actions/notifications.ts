"use server";

import { db } from "@/lib/db";
import { notificationPrefs } from "@/lib/db/schema";
import { isEmailEnabledFor } from "@/lib/email/recipients";
import { isEmailConfigured } from "@/lib/email/send";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { requireSession } from "@/lib/session";

export type EmailPrefs = { configured: boolean; enabled: boolean };

export async function getEmailPrefs(): Promise<EmailPrefs> {
  const session = await requireSession();
  return {
    configured: isEmailConfigured(),
    enabled: await isEmailEnabledFor(session.user.id),
  };
}

export async function setEmailEnabled(enabled: boolean) {
  const session = await requireSession();
  assertRateLimit(`email-prefs:${session.user.id}`, 20, 60_000);

  await db
    .insert(notificationPrefs)
    .values({ userId: session.user.id, emailEnabled: enabled })
    .onConflictDoUpdate({
      target: notificationPrefs.userId,
      set: { emailEnabled: enabled, updatedAt: new Date() },
    });

  return { enabled };
}
