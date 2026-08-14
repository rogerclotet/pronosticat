"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export function LoginForm({ callbackURL = "/" }: { callbackURL?: string }) {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    setLoading(true);
    setError(null);
    await authClient.signIn.social({
      provider: "google",
      callbackURL,
    });
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await authClient.signIn.magicLink({
      email,
      callbackURL,
    });

    setLoading(false);
    if (authError) {
      setError(authError.message ?? tCommon("error"));
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center p-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-black uppercase tracking-tight text-teal">
          Pronosticat
        </h1>
        <p className="mt-2 text-muted">{t("welcomeSubtitle")}</p>
      </div>

      <Card className="w-full max-w-sm space-y-4">
        <Button
          className="w-full"
          onClick={handleGoogleSignIn}
          disabled={loading}
          variant="secondary"
        >
          {t("continueWithGoogle")}
        </Button>

        <div className="flex items-center gap-3">
          <div className="h-0.5 flex-1 bg-border" />
          <span className="text-xs uppercase text-muted">{t("magicLink")}</span>
          <div className="h-0.5 flex-1 bg-border" />
        </div>

        {sent ? (
          <p className="text-center text-sm text-teal">{t("linkSent")}</p>
        ) : (
          <form onSubmit={handleMagicLink} className="space-y-3">
            <Input
              type="email"
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {t("sendLink")}
            </Button>
          </form>
        )}

        {error && <p className="text-center text-sm text-danger">{error}</p>}
      </Card>
    </div>
  );
}
