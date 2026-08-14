"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Competition } from "@/lib/constants";

type StandingRow = {
  userId: string;
  name: string;
  points: number;
  hits: number;
  misses: number;
};

type GroupTabViewProps = {
  standings: StandingRow[];
  activeGroup: {
    id: string;
    name: string;
    competition: Competition;
    inviteCode: string;
  };
  memberCount: number;
  viewerIsAdmin: boolean;
  viewerUserId: string;
};

export function GroupTabView({
  standings,
  activeGroup,
  memberCount,
  viewerIsAdmin,
  viewerUserId,
}: GroupTabViewProps) {
  const t = useTranslations("group");
  const router = useRouter();
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);

  const maxPoints = standings[0]?.points ?? 1;

  async function handleInvite() {
    await navigator.clipboard.writeText(activeGroup.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-3 p-4 pb-6">
      <div className="flex items-baseline justify-between border-b-2 border-border pb-2">
        <span className="font-sans text-[15px] font-extrabold uppercase">{t("title")}</span>
        <span className="font-mono text-[9.5px] uppercase tracking-[0.09em] text-muted">
          {t("note", { count: memberCount })}
        </span>
      </div>

      {standings.length === 0 ? (
        <p className="text-sm text-muted">{t("noMembers")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {standings.map((row, i) => {
            const isMe = row.userId === viewerUserId;
            return (
              <button
                key={row.userId}
                type="button"
                onClick={() =>
                  !isMe && router.push(`${pathname}?sheet=rival&rival=${row.userId}`)
                }
                className={cn(
                  "flex w-full items-center gap-2.5 border-2 p-2.5 text-left",
                  isMe ? "border-teal bg-highlight-bg" : "border-border bg-surface",
                )}
              >
                <span
                  className={cn(
                    "w-6 font-mono text-sm font-bold",
                    i === 0 ? "text-teal" : "text-muted",
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex flex-1 flex-col gap-1.5">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-sans text-[12.5px] font-semibold">{row.name}</span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted">
                      {row.hits}✓ {row.misses}✗
                    </span>
                  </span>
                  <ProgressBar
                    pct={(row.points / maxPoints) * 100}
                    color={isMe ? "teal" : "muted"}
                  />
                </div>
                <span className="font-mono text-sm font-bold tabular-nums">{row.points}</span>
              </button>
            );
          })}
        </div>
      )}

      <Button type="button" variant="secondary" onClick={handleInvite}>
        {copied ? t("codeCopied") : t("invite")}
      </Button>

      <div className="mt-1.5 border-b-2 border-border pb-2 font-sans text-[13.5px] font-extrabold uppercase">
        {t("manage")}
      </div>
      <div className="border-2 border-border bg-surface">
        <ManageRow label={t("inviteCode")} value={activeGroup.inviteCode} />
        <ManageRow label={t("members")} value={String(memberCount)} />
        <ManageRow label={t("yourRole")} value={viewerIsAdmin ? t("admin") : t("member")} />
        <ManageRow
          label={t("competition")}
          value={t(`competitions.${activeGroup.competition}`)}
          last
        />
        <button
          type="button"
          onClick={() => router.push(`${pathname}?sheet=groups`)}
          className="w-full px-2.5 py-3 text-left font-mono text-[10.5px] font-bold uppercase tracking-[0.09em] text-teal"
        >
          {t("switch")}
        </button>
      </div>
    </div>
  );
}

function ManageRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2.5 px-2.5 py-2.5",
        !last && "border-b-2 border-border",
      )}
    >
      <span className="font-mono text-[9px] uppercase tracking-[0.09em] text-muted">{label}</span>
      <span className="font-mono text-sm font-bold">{value}</span>
    </div>
  );
}
