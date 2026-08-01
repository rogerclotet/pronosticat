import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { magicLink } from "better-auth/plugins";
import { Resend } from "resend";
import { db } from "./db";
import * as schema from "./db/schema";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
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
          console.log(`Magic link for ${email}: ${url}`);
          return;
        }
        await resend.emails.send({
          from: process.env.EMAIL_FROM ?? "onboarding@resend.dev",
          to: email,
          subject: "Inicia sessió a Pronosticat",
          html: `<p>Fes clic per iniciar sessió:</p><a href="${url}">${url}</a>`,
        });
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
