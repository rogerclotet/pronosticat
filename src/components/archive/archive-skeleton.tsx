import { Skeleton } from "@/components/ui/skeleton";

export function ArchiveSkeleton() {
  return (
    <div
      className="flex flex-col gap-5 p-4 pb-6"
      aria-busy
      aria-label="Loading"
    >
      {Array.from({ length: 2 }).map((_, section) => (
        <div key={section} className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between border-b-2 border-border pb-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="border-2 border-border bg-surface p-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-4 w-32" />
          </div>
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, row) => (
              <div
                key={row}
                className="flex items-center gap-3 border-2 border-border bg-surface px-3 py-2.5"
              >
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
