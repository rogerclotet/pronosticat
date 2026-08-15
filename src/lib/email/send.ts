import "server-only";

import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY?.trim();
const resend = apiKey ? new Resend(apiKey) : null;
const emailFrom = process.env.EMAIL_FROM?.trim() || "onboarding@resend.dev";

export function isEmailConfigured(): boolean {
  return resend !== null;
}

export function appBaseUrl(): string {
  return process.env.BETTER_AUTH_URL?.trim() || "http://localhost:3000";
}

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Surfaced as List-Unsubscribe so clients can offer a one-tap opt-out. */
  unsubscribeUrl: string;
};

export async function sendEmail(email: OutgoingEmail): Promise<boolean> {
  if (!resend) return false;

  const { error } = await resend.emails.send({
    from: emailFrom,
    to: email.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
    headers: {
      "List-Unsubscribe": `<${email.unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  if (error) {
    console.error("[email] send failed:", error);
    return false;
  }
  return true;
}
