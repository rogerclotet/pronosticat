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

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: authUrl,
  trustedOrigins: authUrl ? [authUrl] : [],
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
