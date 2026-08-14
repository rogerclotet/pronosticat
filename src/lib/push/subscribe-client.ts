"use client";

import { subscribeToPush, unsubscribeFromPush } from "@/lib/actions/push";
import {
  registerPushWorker,
  serializePushSubscription,
  subscribeBrowserPush,
  unsubscribeBrowserPush,
} from "@/lib/push/browser";

export async function enablePushNotifications(publicKey: string) {
  await registerPushWorker();
  const subscription = await subscribeBrowserPush(publicKey);
  await subscribeToPush(serializePushSubscription(subscription));
}

export async function disablePushNotifications() {
  const endpoint = await unsubscribeBrowserPush();
  if (endpoint) await unsubscribeFromPush(endpoint);
}

export async function syncGrantedPushSubscription(publicKey: string) {
  if (Notification.permission !== "granted") return;
  await enablePushNotifications(publicKey);
}
