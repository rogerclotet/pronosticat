import { getTranslations } from "next-intl/server";

/**
 * Precached by the service worker and served when a navigation fails, so it
 * must render without a session or any data of its own.
 */
export default async function OfflinePage() {
  const t = await getTranslations("offline");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background p-6 text-center">
      <h1 className="font-sans text-xl font-extrabold uppercase text-teal">
        {t("title")}
      </h1>
      <p className="max-w-xs text-sm leading-relaxed text-text-secondary">
        {t("body")}
      </p>
    </div>
  );
}
