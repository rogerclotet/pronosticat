import { Skeleton } from "@/components/ui/skeleton";

export function GroupSkeleton() {
  return (
    <div
      className="flex flex-col gap-3.5 p-4 pb-6"
      aria-busy
      aria-label="Loading"
    >
      <div className="border-b-2 border-border pb-2">
        <Skeleton className="h-5 w-28" />
      </div>

      <div className="border-2 border-border bg-surface p-3">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="mt-2 h-3 w-24" />
      </div>

      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-2 border-border bg-surface px-3 py-2.5"
          >
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}
