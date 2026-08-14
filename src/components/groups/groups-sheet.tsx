"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Sheet } from "@/components/ui/sheet";
import { useRouter } from "@/i18n/routing";
import { deleteGroup, getMyGroups, setActiveGroup } from "@/lib/actions/groups";
import { cn, formatOrdinal } from "@/lib/utils";

type GroupWithMeta = Awaited<ReturnType<typeof getMyGroups>>[number];

type GroupsSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  activeGroupId?: string;
};

export function GroupsSheet({
  isOpen,
  onClose,
  activeGroupId,
}: GroupsSheetProps) {
  const t = useTranslations("groupsSheet");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [groups, setGroups] = useState<GroupWithMeta[] | null>(null);
  const [pendingDelete, setPendingDelete] = useState<GroupWithMeta | null>(
    null,
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!isOpen) {
      setPendingDelete(null);
      setDeleteError(null);
      return;
    }
    let cancelled = false;
    getMyGroups().then((data) => {
      if (!cancelled) setGroups(data);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  function handleSelect(groupId: string) {
    startTransition(async () => {
      await setActiveGroup(groupId);
      router.refresh();
      onClose();
    });
  }

  function handleDelete() {
    if (!pendingDelete) return;
    setDeleteError(null);
    startTransition(async () => {
      try {
        await deleteGroup(pendingDelete.id);
        setPendingDelete(null);
        setGroups(await getMyGroups());
        router.refresh();
      } catch {
        setDeleteError(tCommon("error"));
      }
    });
  }

  if (!isOpen) return null;

  return (
    <>
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
              <div
                key={g.id}
                className={cn(
                  "w-full border-2",
                  isActive
                    ? "border-teal bg-highlight-bg"
                    : "border-border bg-surface",
                )}
              >
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => handleSelect(g.id)}
                  className="w-full text-left disabled:opacity-60"
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
                        {t("meta", {
                          members: g.memberCount,
                          rank: formatOrdinal(g.rank),
                          total: g.memberCount,
                        })}
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
                {g.isAdmin ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      setDeleteError(null);
                      setPendingDelete(g);
                    }}
                    className="w-full border-t-2 border-border px-3 py-2 text-left font-mono text-[10.5px] font-bold uppercase tracking-[0.09em] text-danger disabled:opacity-60"
                  >
                    {t("delete")}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </Sheet>

      {pendingDelete ? (
        <Dialog
          title={t("deleteConfirmTitle")}
          onClose={() => {
            if (!pending) setPendingDelete(null);
          }}
          footer={
            <>
              <Button
                type="button"
                variant="danger"
                disabled={pending}
                onClick={handleDelete}
              >
                {t("deleteConfirm")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={() => setPendingDelete(null)}
              >
                {t("deleteCancel")}
              </Button>
            </>
          }
        >
          <p className="text-sm text-text-secondary">
            {t("deleteConfirmBody", { name: pendingDelete.name })}
          </p>
          {deleteError ? (
            <p className="mt-2 text-sm text-danger">{deleteError}</p>
          ) : null}
        </Dialog>
      ) : null}
    </>
  );
}
