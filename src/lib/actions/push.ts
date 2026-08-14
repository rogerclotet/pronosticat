"use server";

import { and, eq } from "drizzle-orm";
import { generateId } from "@/lib/constants";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { parsePushSubscription } from "@/lib/push/validate";
import { getVapidConfig } from "@/lib/push/vapid";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { requireSession } from "@/lib/session";

export async function getPushPublicKey() {
  return getVapidConfig()?.publicKey ?? null;
}

export async function subscribeToPush(input: unknown) {
  const session = await requireSession();
  assertRateLimit(`push-subscribe:${session.user.id}`, 20, 60_000);

  if (!getVapidConfig()) {
    throw new Error("Push notifications are not configured");
  }

  const subscription = parsePushSubscription(input);
  if (!subscription) {
    throw new Error("Invalid push subscription");
  }

  const now = new Date();
  await db
    .insert(pushSubscriptions)
    .values({
      id: generateId(),
      userId: session.user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        userId: session.user.id,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        updatedAt: now,
      },
    });

  return { ok: true as const };
}

export async function unsubscribeFromPush(endpoint: string) {
  const session = await requireSession();
  const trimmed = endpoint.trim();
  if (!trimmed) return { ok: true as const };

  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, session.user.id),
        eq(pushSubscriptions.endpoint, trimmed),
      ),
    );

  return { ok: true as const };
}
