"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/** How often to ask the browser whether sw.js changed. */
const UPDATE_CHECK_MS = 60 * 60 * 1000;

/**
 * Registers the worker and surfaces a waiting one. A new worker is never
 * activated behind the user's back: swapping it mid-round would reload the
 * page under them, possibly while they are filling the board.
 */
export function ServiceWorkerUpdater() {
  const t = useTranslations("update");
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | null = null;
    let cancelled = false;

    function trackInstalling(reg: ServiceWorkerRegistration) {
      const installing = reg.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        // A worker that reaches "installed" while one is already in control
        // is an update, not the very first install.
        if (
          installing.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          setWaiting(reg.waiting ?? installing);
        }
      });
    }

    // Once the new worker takes over, the page must reload to match it.
    let reloading = false;
    function onControllerChange() {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    }
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => {
        if (cancelled) return;
        registration = reg;
        if (reg.waiting && navigator.serviceWorker.controller) {
          setWaiting(reg.waiting);
        }
        trackInstalling(reg);
        reg.addEventListener("updatefound", () => trackInstalling(reg));
      })
      .catch((error) => console.warn("[sw] registration failed", error));

    const interval = setInterval(() => {
      void registration?.update();
    }, UPDATE_CHECK_MS);

    function onVisible() {
      if (document.visibilityState === "visible") void registration?.update();
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
    };
  }, []);

  if (!waiting) return null;

  return (
    <div className="fixed inset-x-0 bottom-20 z-50 mx-auto max-w-lg px-4">
      <div className="flex items-center gap-3 border-2 border-teal bg-highlight-bg p-3">
        <p className="flex-1 text-sm leading-snug">{t("available")}</p>
        <Button
          type="button"
          size="sm"
          disabled={applying}
          onClick={() => {
            setApplying(true);
            waiting.postMessage({ type: "SKIP_WAITING" });
          }}
        >
          {t("cta")}
        </Button>
      </div>
    </div>
  );
}
