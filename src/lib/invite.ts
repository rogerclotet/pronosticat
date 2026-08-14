export const INVITE_CODE_PATTERN = /^[A-Z2-9]{6,12}$/;

export function normalizeInviteCode(code: string): string | null {
  const normalized = code.trim().toUpperCase();
  if (!INVITE_CODE_PATTERN.test(normalized)) return null;
  return normalized;
}

export function invitePath(code: string): string {
  return `/invite/${code}`;
}

export function inviteJoinPath(code: string): string {
  return `${invitePath(code)}?join=1`;
}

export function loginWithInvitePath(code: string): string {
  return `/login?next=${encodeURIComponent(inviteJoinPath(code))}`;
}

/**
 * Only invite continuation URLs may be used as a post-auth callback.
 * Reconstructs the path so a crafted `next` cannot open an external URL.
 */
export function sanitizeAuthCallbackUrl(
  next: string | undefined,
): string | null {
  if (!next) return null;
  if (next.includes("%") || next.includes("\\") || next.includes("://")) {
    return null;
  }
  if (!next.startsWith("/") || next.startsWith("//")) return null;

  let url: URL;
  try {
    url = new URL(next, "http://pronosticat.local");
  } catch {
    return null;
  }
  if (url.origin !== "http://pronosticat.local" || url.hash) return null;

  const match = url.pathname.match(/^\/invite\/([A-Z2-9]{6,12})$/i);
  if (!match) return null;

  const extraKeys = [...url.searchParams.keys()].filter(
    (key) => key !== "join",
  );
  if (extraKeys.length > 0) return null;
  const join = url.searchParams.get("join");
  if (join != null && join !== "1") return null;

  const code = match[1].toUpperCase();
  return join === "1" ? inviteJoinPath(code) : invitePath(code);
}
