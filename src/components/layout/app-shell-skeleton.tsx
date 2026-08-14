import { Skeleton } from "@/components/ui/skeleton";

/**
 * The static shell Next can prerender: same chrome geometry as `AppShell`, but
 * with nothing that depends on the session, so it streams in immediately while
 * the real chrome resolves.
 */
export function AppShellSkeleton() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-background">
      <div className="border-b-2 border-border bg-header-bg">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 pb-3 pt-6">
          <span className="font-sans text-lg font-extrabold uppercase tracking-tight">
            Pronosticat
          </span>
          <Skeleton className="h-[30px] w-28 border-2 border-border" />
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col bg-background pb-20" />

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-border bg-header-bg">
        <div className="mx-auto flex max-w-lg">
          {[0, 1, 2, 3].map((slot) => (
            <div
              key={slot}
              className="flex flex-1 flex-col items-center gap-1.5 border-t-[3px] border-transparent py-3"
            >
              <Skeleton className="h-[18px] w-[18px]" />
              <Skeleton className="h-[9.5px] w-10" />
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
}
