"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  type EmailPrefs,
  getEmailPrefs,
  setEmailEnabled,
} from "@/lib/actions/notifications";
import { getPushPublicKey } from "@/lib/actions/push";
import {
  getExistingPushSubscription,
  readPushSupport,
  registerPushWorker,
} from "@/lib/push/browser";
import {
  disablePushNotifications,
  enablePushNotifications,
} from "@/lib/push/subscribe-client";

type SettingsStatus =
  | "loading"
  | "unconfigured"
  | "unsupported"
  | "needs-install"
  | "denied"
  | "off"
  | "on";

export function NotificationSettings() {
  const t = useTranslations("push");
  const tCommon = useTranslations("common");
  const [status, setStatus] = useState<SettingsStatus>("loading");
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const key = await getPushPublicKey();
      if (cancelled) return;
      setPublicKey(key);
      if (!key) {
        setStatus("unconfigured");
        return;
      }

      const support = readPushSupport();
      if (support === "unsupported") {
        setStatus("unsupported");
        return;
      }
      if (support === "needs-install") {
        setStatus("needs-install");
        return;
      }
      if (support === "denied") {
        setStatus("denied");
        return;
      }

      await registerPushWorker();
      if (cancelled) return;
      const subscription = await getExistingPushSubscription();
      if (cancelled) return;
      setStatus(subscription ? "on" : "off");
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleEnable() {
    if (!publicKey) return;
    setPending(true);
    setError(null);
    try {
      await enablePushNotifications(publicKey);
      setStatus("on");
    } catch {
      setError(t("enableError"));
    } finally {
      setPending(false);
    }
  }

  async function handleDisable() {
    setPending(true);
    setError(null);
    try {
      await disablePushNotifications();
      setStatus("off");
    } catch {
      setError(tCommon("error"));
    } finally {
      setPending(false);
    }
  }

  if (status === "loading" || status === "unconfigured") {
    return <EmailSettings pushOn={false} />;
  }

  const copy =
    status === "unsupported"
      ? t("unsupported")
      : status === "needs-install"
        ? t("installBody")
        : status === "denied"
          ? t("denied")
          : status === "on"
            ? t("enabled")
            : t("disabled");

  return (
    <div className="border-2 border-border bg-surface p-4">
      <div className="label-mono">{t("settingsLabel")}</div>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">{copy}</p>
      {status === "off" ? (
        <Button
          type="button"
          size="sm"
          className="mt-3"
          disabled={pending}
          onClick={handleEnable}
        >
          {t("askCta")}
        </Button>
      ) : null}
      {status === "on" ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="mt-3"
          disabled={pending}
          onClick={handleDisable}
        >
          {t("disableCta")}
        </Button>
      ) : null}
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}

      <EmailSettings pushOn={status === "on"} />
    </div>
  );
}

/**
 * Email only ever fires when push cannot reach you, so the copy says so
 * rather than implying two parallel streams of notifications.
 */
function EmailSettings({ pushOn }: { pushOn: boolean }) {
  const t = useTranslations("push");
  const tCommon = useTranslations("common");
  const [prefs, setPrefs] = useState<EmailPrefs | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getEmailPrefs()
      .then((value) => {
        if (!cancelled) setPrefs(value);
      })
      .catch(() => {
        if (!cancelled) setPrefs(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!prefs?.configured) return null;

  async function toggle() {
    if (!prefs) return;
    setPending(true);
    setError(null);
    try {
      const next = await setEmailEnabled(!prefs.enabled);
      setPrefs({ ...prefs, enabled: next.enabled });
    } catch {
      setError(tCommon("error"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-4 border-t-2 border-border pt-3">
      <div className="label-mono">{t("emailLabel")}</div>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">
        {prefs.enabled
          ? pushOn
            ? t("emailEnabledPushOn")
            : t("emailEnabled")
          : t("emailDisabled")}
      </p>
      <Button
        type="button"
        size="sm"
        variant={prefs.enabled ? "secondary" : "primary"}
        className="mt-3"
        disabled={pending}
        onClick={toggle}
      >
        {prefs.enabled ? t("emailDisableCta") : t("emailEnableCta")}
      </Button>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
