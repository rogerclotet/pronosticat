"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const t = useTranslations("perfil");
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="border-2 border-border-strong bg-transparent px-3 py-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.09em] text-muted"
    >
      {t("signOut")}
    </button>
  );
}
