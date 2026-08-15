import "server-only";

import { headers } from "next/headers";

/**
 * The per-request CSP nonce set by `src/proxy.ts`. Anything that renders a
 * real <style> or <script> tag needs it, or the browser drops the tag.
 */
export async function getCspNonce(): Promise<string | undefined> {
  return (await headers()).get("x-nonce") ?? undefined;
}
