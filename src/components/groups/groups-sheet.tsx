"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getUserGroupsWithMeta, setActiveGroup } from "@/lib/actions/groups";

type GroupWithMeta = Awaited<ReturnType<typeof getUserGroupsWithMeta>>[number];

type GroupsSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  activeGroupId?: string;
};

export function GroupsSheet({ isOpen, onClose, userId, activeGroupId }: GroupsSheetProps) {
  const t = useTranslations("groupsSheet");
  const router = useRouter();
  const [groups, setGroups] = useState<GroupWithMeta[] | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    getUserGroupsWithMeta(userId).then((data) => {
      if (!cancelled) setGroups(data);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, userId]);

  if (!isOpen) return null;

  function handleSelect(groupId: string) {
    startTransition(async () => {
      await setActiveGroup(groupId);
      router.refresh();
      onClose();
    });
  }

  return (
    <Sheet
      title={t("title")}
      onClose={onClose}
      footer={
        <>
          <Button
            type="button"
            variant="primary"
            onClick={() => router.push("/onboarding?mode=create")}
          >
            {t("createNew")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/onboarding?mode=join")}
          >
            {t("joinCode")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2.5">
        {(groups ?? []).map((g) => {
          const isActive = g.id === activeGroupId;
          return (
            <button
              key={g.id}
              type="button"
              disabled={pending}
              onClick={() => handleSelect(g.id)}
              className={cn(
                "w-full border-2 text-left disabled:opacity-60",
                isActive ? "border-teal bg-highlight-bg" : "border-border bg-surface",
              )}
            >
              <div className="flex items-center justify-between gap-2.5 p-3">
                <div className="flex flex-col gap-1.5">
                  <span
                    className={cn(
                      "font-sans text-sm font-semibold",
                      isActive ? "text-teal" : "text-foreground",
                    )}
                  >
                    {g.name}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.09em] text-muted">
                    {t("meta", { members: g.memberCount, rank: g.rank, total: g.memberCount })}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="font-mono text-sm font-bold tabular-nums text-teal">
                    {g.points}
                  </span>
                  <span className="font-mono text-[8.5px] uppercase tracking-[0.09em] text-muted/80">
                    {g.isAdmin ? t("roleAdmin") : t("roleMember")}
                  </span>
                </div>
              </div>
              <div className="border-t-2 border-border px-3 py-2 font-mono text-[9px] uppercase tracking-[0.09em] text-muted/70">
                {g.inviteCode}
              </div>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
