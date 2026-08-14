import "server-only";

export type VapidConfig = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

export function getVapidConfig(): VapidConfig | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) return null;

  const configured = process.env.VAPID_SUBJECT?.trim();
  const authUrl = process.env.BETTER_AUTH_URL?.trim();
  const subject =
    configured ||
    (authUrl?.startsWith("https://") ? authUrl : "") ||
    "mailto:pronosticat@localhost";

  return { publicKey, privateKey, subject };
}

export function isPushConfigured(): boolean {
  return getVapidConfig() !== null;
}
