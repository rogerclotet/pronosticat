"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { getPushPublicKey } from "@/lib/actions/push";
import {
  dismissPushPrompt,
  readPushSupport,
  registerPushWorker,
  wasPushPromptDismissed,
} from "@/lib/push/browser";
import {
  enablePushNotifications,
  syncGrantedPushSubscription,
} from "@/lib/push/subscribe-client";

type PromptView = "hidden" | "ask" | "install";

export function PushPermissionPrompt() {
  const t = useTranslations("push");
  const [view, setView] = useState<PromptView>("hidden");
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const key = await getPushPublicKey();
      if (!key || cancelled || !("Notification" in window)) return;

      const support = readPushSupport();
      if (support === "unsupported" || support === "denied") return;

      await registerPushWorker();
      if (cancelled) return;

      if (Notification.permission === "granted") {
        try {
          await syncGrantedPushSubscription(key);
        } catch {
          // Subscription sync is best-effort; the prompt is for first-time ask.
        }
        return;
      }

      if (wasPushPromptDismissed()) return;

      await new Promise((resolve) => setTimeout(resolve, 800));
      if (cancelled) return;

      setPublicKey(key);
      setView(support === "needs-install" ? "install" : "ask");
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  function close() {
    dismissPushPrompt();
    setView("hidden");
    setError(null);
  }

  async function handleEnable() {
    if (!publicKey) return;
    setPending(true);
    setError(null);
    try {
      await enablePushNotifications(publicKey);
      close();
    } catch {
      setError(t("enableError"));
    } finally {
      setPending(false);
    }
  }

  if (view === "hidden") return null;

  if (view === "install") {
    return (
      <Dialog
        title={t("installTitle")}
        onClose={close}
        footer={
          <Button type="button" variant="secondary" onClick={close}>
            {t("installCta")}
          </Button>
        }
      >
        <p className="text-sm leading-relaxed text-text-secondary">
          {t("installBody")}
        </p>
      </Dialog>
    );
  }

  return (
    <Dialog
      title={t("askTitle")}
      onClose={() => {
        if (!pending) close();
      }}
      footer={
        <>
          <Button type="button" disabled={pending} onClick={handleEnable}>
            {t("askCta")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={close}
          >
            {t("askLater")}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-text-secondary">
        {t("askBody")}
      </p>
      <ul className="mt-3 flex flex-col gap-1.5 text-sm text-text-secondary">
        <li>— {t("askReasonResults")}</li>
        <li>— {t("askReasonDeadline")}</li>
      </ul>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </Dialog>
  );
}
