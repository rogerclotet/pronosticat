"use client";

import { Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useRouter } from "@/i18n/routing";
import { copyEntriesFromGroup } from "@/lib/actions/groups";
import type { CopyableSourceGroup } from "@/lib/queries/groups";
import { cn } from "@/lib/utils";

type CopyFromGroupButtonProps = {
  groupId: string;
  sources: CopyableSourceGroup[];
  currentPickCount: number;
};

export function CopyFromGroupButton({
  groupId,
  sources,
  currentPickCount,
}: CopyFromGroupButtonProps) {
  const t = useTranslations("predictions");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [selectedId, setSelectedId] = useState(sources[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sources.length === 0) return null;

  const selected =
    sources.find((source) => source.id === selectedId) ?? sources[0];
  const singleSource = sources.length === 1;

  function openDialog() {
    setSelectedId(sources[0]?.id ?? "");
    setError(null);
    setConfirming(false);
    setOpen(true);
  }

  function requestCopy() {
    if (currentPickCount > 0) {
      setError(null);
      setConfirming(true);
      return;
    }
    void handleCopy();
  }

  async function handleCopy() {
    if (!selected) return;
    setPending(true);
    setError(null);
    try {
      await copyEntriesFromGroup({
        sourceGroupId: selected.id,
        targetGroupId: groupId,
      });
      setConfirming(false);
      setOpen(false);
      router.refresh();
    } catch {
      setError(t("copyError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={openDialog}
      >
        <span className="inline-flex items-center justify-center gap-2">
          <Copy className="size-3.5" strokeWidth={2.5} />
          {singleSource
            ? t("copyFromOne", { name: sources[0].name })
            : t("copyFromOther")}
        </span>
      </Button>

      {open && selected && !confirming ? (
        <Dialog
          title={t("copyTitle")}
          onClose={() => {
            if (!pending) setOpen(false);
          }}
          footer={
            <>
              <Button type="button" disabled={pending} onClick={requestCopy}>
                {t("copyCta")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                {tCommon("cancel")}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-3">
            <p className="text-sm text-text-secondary">{t("copyBody")}</p>

            {singleSource ? (
              <div className="border-2 border-teal bg-highlight-bg px-3 py-2.5">
                <span className="font-sans text-sm font-semibold text-teal">
                  {selected.name}
                </span>
                <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.09em] text-muted">
                  {t("copyPickMeta", { count: selected.pickCount })}
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {sources.map((source) => {
                  const isSelected = source.id === selected.id;
                  return (
                    <button
                      key={source.id}
                      type="button"
                      disabled={pending}
                      onClick={() => setSelectedId(source.id)}
                      aria-pressed={isSelected}
                      className={cn(
                        "w-full border-2 px-3 py-2.5 text-left disabled:opacity-60",
                        isSelected
                          ? "border-teal bg-highlight-bg"
                          : "border-border bg-surface",
                      )}
                    >
                      <span
                        className={cn(
                          "font-sans text-sm font-semibold",
                          isSelected ? "text-teal" : "text-foreground",
                        )}
                      >
                        {source.name}
                      </span>
                      <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.09em] text-muted">
                        {t("copyPickMeta", { count: source.pickCount })}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {error ? <p className="text-sm text-danger">{error}</p> : null}
          </div>
        </Dialog>
      ) : null}

      {open && selected && confirming ? (
        <Dialog
          title={t("copyConfirmTitle")}
          onClose={() => {
            if (!pending) setConfirming(false);
          }}
          footer={
            <>
              <Button
                type="button"
                variant="danger"
                disabled={pending}
                onClick={handleCopy}
              >
                {t("copyConfirm")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={() => setConfirming(false)}
              >
                {tCommon("cancel")}
              </Button>
            </>
          }
        >
          <p className="text-sm text-text-secondary">
            {t("copyConfirmBody", { name: selected.name })}
          </p>
          {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
        </Dialog>
      ) : null}
    </>
  );
}
