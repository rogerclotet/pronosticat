"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { joinGroup } from "@/lib/actions/groups";
import { loginWithInvitePath } from "@/lib/invite";
import type { Competition } from "@/lib/constants";
import { cn } from "@/lib/utils";

type InviteAcceptViewProps = {
  inviteCode: string;
  groupName: string;
  competition: Competition;
  memberCount: number;
  isLoggedIn: boolean;
  initialError?: boolean;
};

export function InviteAcceptView({
  inviteCode,
  groupName,
  competition,
  memberCount,
  isLoggedIn,
  initialError = false,
}: InviteAcceptViewProps) {
  const t = useTranslations("invite");
  const tGroup = useTranslations("group");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(initialError ? t("error") : null);

  function handleAccept() {
    setError(null);
    if (!isLoggedIn) {
      router.push(loginWithInvitePath(inviteCode));
      return;
    }
    startTransition(async () => {
      try {
        await joinGroup(inviteCode);
        router.replace("/");
      } catch {
        setError(t("error"));
      }
    });
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-lg flex-col bg-header-bg">
      <div className="flex flex-1 flex-col gap-4 overflow-auto px-5 pb-5 pt-16">
        <h1 className="font-sans text-[34px] font-extrabold uppercase leading-[0.95] tracking-tight">
          {t("title")}
        </h1>
        <p className="max-w-xs font-sans text-[13px] leading-relaxed text-text-secondary">
          {t("body", { name: groupName })}
        </p>

        <div className="flex flex-col gap-3 border-2 border-border bg-background p-3.5">
          <InviteFact label={t("groupLabel")} value={groupName} accent />
          <InviteFact
            label={t("competitionLabel")}
            value={tGroup(`competitions.${competition}`)}
          />
          <InviteFact
            label={t("membersLabel")}
            value={String(memberCount)}
          />
          <InviteFact label={t("codeLabel")} value={inviteCode} />
        </div>

        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>

      <div className="flex flex-col gap-2 px-5 pb-8">
        <Button type="button" size="lg" disabled={pending} onClick={handleAccept}>
          {t("accept")}
        </Button>
        {isLoggedIn ? null : (
          <p className="text-center font-mono text-[10px] uppercase tracking-[0.09em] text-muted">
            {t("loginHint")}
          </p>
        )}
      </div>
    </div>
  );
}

function InviteFact({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="label-mono">{label}</span>
      <div
        className={cn(
          "border-2 border-border-strong bg-background px-2.5 py-3 font-mono text-sm font-bold",
          accent ? "text-teal" : "text-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );
}
