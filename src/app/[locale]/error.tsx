"use client";

import { useEffect } from "react";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[pronosticat] Server Components render error:", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <h1 className="font-sans text-xl font-extrabold uppercase">S&apos;ha produït un error</h1>
      <p className="max-w-sm text-sm text-text-secondary">
        No s&apos;ha pogut carregar la pàgina. Torna-ho a provar d&apos;aquí a uns segons.
      </p>
      {error.digest && (
        <p className="font-mono text-[10px] text-muted">Ref: {error.digest}</p>
      )}
      <button
        type="button"
        onClick={reset}
        className="border-2 border-border-strong bg-teal px-4 py-2 font-mono text-xs font-bold text-background"
      >
        TORNA-HO A PROVAR
      </button>
    </div>
  );
}
