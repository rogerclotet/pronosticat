"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { InviteShareButton } from "@/components/groups/invite-share-button";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ProgressBar } from "@/components/ui/progress-bar";
import { usePathname, useRouter } from "@/i18n/routing";
import { rotateInviteCode } from "@/lib/actions/groups";
import type { Competition } from "@/lib/constants";
import type { StandingRow } from "@/lib/queries/groups";
import { cn } from "@/lib/utils";

/**
 * Points start at zero and challenges can subtract, so the bar is drawn over
 * the full spread of the table rather than as a fraction of the leader's
 * total: that keeps it meaningful when everyone is on zero or below it.
 */
function barPct(points: number, low: number, high: number): number {
  if (high <= low) return points > 0 ? 100 : 0;
  return ((points - low) / (high - low)) * 100;
}

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
  /** Rendered on the server: the chart needs the request's CSP nonce. */
  chart: React.ReactNode;
};

export function GroupTabView({
  standings,
  activeGroup,
  memberCount,
  viewerIsAdmin,
  viewerUserId,
  chart,
}: GroupTabViewProps) {
  const t = useTranslations("group");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const [confirmingRotate, setConfirmingRotate] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [rotateError, setRotateError] = useState<string | null>(null);

  async function handleRotate() {
    setRotating(true);
    setRotateError(null);
    try {
      await rotateInviteCode(activeGroup.id);
      setConfirmingRotate(false);
      router.refresh();
    } catch {
      setRotateError(tCommon("error"));
    } finally {
      setRotating(false);
    }
  }

  const points = standings.map((row) => row.points);
  const high = Math.max(0, ...points);
  const low = Math.min(0, ...points);

  return (
    <>
      <div className="flex flex-col gap-3 p-4 pb-6">
        <div className="flex items-baseline justify-between border-b-2 border-border pb-2">
          <span className="font-sans text-[15px] font-extrabold uppercase">
            {t("title")}
          </span>
          <span className="font-mono text-[9.5px] uppercase tracking-[0.09em] text-muted">
            {t("note", { count: memberCount })}
          </span>
        </div>

        {standings.length === 0 ? (
          <p className="text-sm text-muted">{t("noMembers")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {standings.map((row) => {
              const isMe = row.userId === viewerUserId;
              return (
                <button
                  key={row.userId}
                  type="button"
                  onClick={() =>
                    !isMe &&
                    router.push(`${pathname}?sheet=rival&rival=${row.userId}`)
                  }
                  className={cn(
                    "flex w-full items-center gap-2.5 border-2 p-2.5 text-left",
                    isMe
                      ? "border-teal bg-highlight-bg"
                      : "border-border bg-surface",
                  )}
                >
                  <span
                    className={cn(
                      "w-6 font-mono text-sm font-bold",
                      row.rank === 1 ? "text-teal" : "text-muted",
                    )}
                  >
                    {String(row.rank).padStart(2, "0")}
                  </span>
                  <div className="flex flex-1 flex-col gap-1.5">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="font-sans text-[12.5px] font-semibold">
                        {row.name}
                      </span>
                      <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted">
                        {row.hits}✓ {row.misses}✗
                      </span>
                    </span>
                    <ProgressBar
                      pct={barPct(row.points, low, high)}
                      color={isMe ? "teal" : "muted"}
                    />
                  </div>
                  <span className="font-mono text-sm font-bold tabular-nums">
                    {row.points}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {chart}

        <InviteShareButton
          inviteCode={activeGroup.inviteCode}
          groupName={activeGroup.name}
        />

        <div className="mt-1.5 border-b-2 border-border pb-2 font-sans text-[13.5px] font-extrabold uppercase">
          {t("manage")}
        </div>
        <div className="border-2 border-border bg-surface">
          <ManageRow label={t("inviteCode")} value={activeGroup.inviteCode} />
          <ManageRow label={t("members")} value={String(memberCount)} />
          <ManageRow
            label={t("yourRole")}
            value={viewerIsAdmin ? t("admin") : t("member")}
          />
          <ManageRow
            label={t("competition")}
            value={t(`competitions.${activeGroup.competition}`)}
            last
          />
          <button
            type="button"
            onClick={() => router.push("/arxiu")}
            className="w-full px-2.5 py-3 text-left font-mono text-[10.5px] font-bold uppercase tracking-[0.09em] text-teal"
          >
            {t("archive")}
          </button>
          {viewerIsAdmin ? (
            <button
              type="button"
              onClick={() => {
                setRotateError(null);
                setConfirmingRotate(true);
              }}
              className="w-full px-2.5 py-3 text-left font-mono text-[10.5px] font-bold uppercase tracking-[0.09em] text-danger"
            >
              {t("rotateInvite")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => router.push(`${pathname}?sheet=groups`)}
            className="w-full px-2.5 py-3 text-left font-mono text-[10.5px] font-bold uppercase tracking-[0.09em] text-teal"
          >
            {t("switch")}
          </button>
        </div>
      </div>

      {confirmingRotate ? (
        <Dialog
          title={t("rotateInviteTitle")}
          onClose={() => {
            if (!rotating) setConfirmingRotate(false);
          }}
          footer={
            <>
              <Button
                type="button"
                variant="danger"
                disabled={rotating}
                onClick={handleRotate}
              >
                {t("rotateInviteConfirm")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={rotating}
                onClick={() => setConfirmingRotate(false)}
              >
                {t("rotateInviteCancel")}
              </Button>
            </>
          }
        >
          <p className="text-sm text-text-secondary">{t("rotateInviteBody")}</p>
          {rotateError ? (
            <p className="mt-2 text-sm text-danger">{rotateError}</p>
          ) : null}
        </Dialog>
      ) : null}
    </>
  );
}

function ManageRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2.5 px-2.5 py-2.5",
        !last && "border-b-2 border-border",
      )}
    >
      <span className="font-mono text-[9px] uppercase tracking-[0.09em] text-muted">
        {label}
      </span>
      <span className="font-mono text-sm font-bold">{value}</span>
    </div>
  );
}
