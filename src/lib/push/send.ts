import "server-only";

import { eq } from "drizzle-orm";
import webpush from "web-push";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import type { PushPayload } from "./types";
import { getVapidConfig } from "./vapid";

type StoredSubscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function isGone(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if (!("statusCode" in error)) return false;
  const status = error.statusCode;
  return status === 404 || status === 410;
}

export async function sendPushToSubscription(
  subscription: StoredSubscription,
  payload: PushPayload,
): Promise<"sent" | "gone" | "failed"> {
  const vapid = getVapidConfig();
  if (!vapid) return "failed";

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
      {
        vapidDetails: {
          subject: vapid.subject,
          publicKey: vapid.publicKey,
          privateKey: vapid.privateKey,
        },
        TTL: 12 * 60 * 60,
        urgency: payload.urgency === "high" ? "high" : "normal",
      },
    );
    return "sent";
  } catch (error) {
    if (isGone(error)) {
      await db
        .delete(pushSubscriptions)
        .where(eq(pushSubscriptions.id, subscription.id));
      return "gone";
    }
    console.error("[push] send failed:", error);
    return "failed";
  }
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<{ sent: number; failed: number }> {
  const rows = await db.query.pushSubscriptions.findMany({
    where: eq(pushSubscriptions.userId, userId),
  });

  // One user's devices are independent round trips to different push services.
  const results = await Promise.all(
    rows.map((row) => sendPushToSubscription(row, payload)),
  );

  return {
    sent: results.filter((result) => result === "sent").length,
    failed: results.filter((result) => result === "failed").length,
  };
}
