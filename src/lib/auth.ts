import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { Resend } from "resend";
import { db } from "./db";
import * as schema from "./db/schema";

const resendApiKey = process.env.RESEND_API_KEY?.trim();
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const emailFrom = process.env.EMAIL_FROM?.trim() || "onboarding@resend.dev";

const authUrl = process.env.BETTER_AUTH_URL?.trim();

const MAX_NAME_LENGTH = 40;

/**
 * The client validates the name too, but `/update-user` takes an unconstrained
 * record, so the only binding check is this one.
 */
function assertValidName(value: unknown): string {
  if (typeof value !== "string") throw new Error("Invalid name");
  const name = value.trim();
  if (!name || name.length > MAX_NAME_LENGTH) throw new Error("Invalid name");
  return name;
}

/**
 * On sign-up the name comes from the OAuth profile, not from a form: clamp it
 * rather than reject it, so nobody is locked out over a long Google name.
 */
function clampName(value: unknown, email: unknown): string {
  const name = typeof value === "string" ? value.trim() : "";
  if (name) return name.slice(0, MAX_NAME_LENGTH);
  const fallback = typeof email === "string" ? email.split("@")[0] : "";
  return (fallback || "Jugador").slice(0, MAX_NAME_LENGTH);
}

/**
 * Behind a reverse proxy the socket address is the proxy's, so without this
 * Better Auth resolves no client IP and every caller shares one rate-limit
 * bucket. Only headers the proxy overwrites may be trusted here.
 */
const ipAddressHeaders = (process.env.TRUSTED_IP_HEADERS ?? "x-forwarded-for")
  .split(",")
  .map((header) => header.trim().toLowerCase())
  .filter(Boolean);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: authUrl,
  trustedOrigins: authUrl ? [authUrl] : [],
  advanced: {
    ipAddress: { ipAddressHeaders },
  },
  rateLimit: {
    // Tighter than the 3-per-10s default: a magic link costs an email.
    customRules: {
      "/sign-in/magic-link": { window: 60, max: 5 },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({
          data: { ...user, name: clampName(user.name, user.email) },
        }),
      },
      update: {
        before: async (user) => {
          if (user.name === undefined) return { data: user };
          return { data: { ...user, name: assertValidName(user.name) } };
        },
      },
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        if (!resend) {
          if (process.env.NODE_ENV === "production") {
            throw new Error("Email provider is not configured");
          }
          console.log(
            `[auth] RESEND_API_KEY not set — magic link for ${email}: ${url}`,
          );
          return;
        }

        const { data, error } = await resend.emails.send({
          from: emailFrom,
          to: email,
          subject: "Inicia sessió a Pronosticat",
          html: `<p>Fes clic per iniciar sessió:</p><a href="${url}">${url}</a>`,
        });
        if (error) {
          console.error("[auth] Failed to send magic link:", error);
          throw new Error(error.message);
        }
        console.info(`[auth] Magic link email sent (id=${data?.id})`);
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
