import type { SerializedPushSubscription } from "./types";

const BASE64URL = /^[A-Za-z0-9_-]+$/;
const MAX_ENDPOINT_LENGTH = 2048;
const MAX_KEY_LENGTH = 256;

function isHttpsOrLocal(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    if (url.protocol === "https:") return true;
    return (
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    );
  } catch {
    return false;
  }
}

function isPushKey(value: string): boolean {
  return (
    value.length > 0 && value.length <= MAX_KEY_LENGTH && BASE64URL.test(value)
  );
}

export function parsePushSubscription(
  input: unknown,
): SerializedPushSubscription | null {
  if (typeof input !== "object" || input === null) return null;
  const endpoint =
    "endpoint" in input && typeof input.endpoint === "string"
      ? input.endpoint.trim()
      : "";
  const keys = "keys" in input ? input.keys : null;
  if (typeof keys !== "object" || keys === null) return null;
  const p256dh =
    "p256dh" in keys && typeof keys.p256dh === "string" ? keys.p256dh : "";
  const auth = "auth" in keys && typeof keys.auth === "string" ? keys.auth : "";

  if (
    !endpoint ||
    endpoint.length > MAX_ENDPOINT_LENGTH ||
    !isHttpsOrLocal(endpoint) ||
    !isPushKey(p256dh) ||
    !isPushKey(auth)
  ) {
    return null;
  }

  return { endpoint, keys: { p256dh, auth } };
}
