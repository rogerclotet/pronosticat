import { Skeleton } from "@/components/ui/skeleton";

function SlotCardSkeleton() {
  return (
    <div className="border-2 border-border bg-surface">
      <div className="flex items-center gap-1.5 border-b-2 border-border bg-background px-2 py-1.5">
        <Skeleton className="size-[22px] shrink-0" />
        <Skeleton className="h-4 flex-1" />
      </div>
      <div className="flex flex-col gap-2 px-2.5 pb-1.5 pt-2">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-2.5 w-10" />
      </div>
      <div className="border-t-2 border-border px-2.5 py-2.5">
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}

export function PredictionsSkeleton() {
  return (
    <div
      className="flex flex-col gap-3.5 p-4 pb-6"
      aria-busy
      aria-label="Loading"
    >
      <div className="border-b-2 border-border pb-2">
        <Skeleton className="h-5 w-32" />
      </div>

      <div className="flex">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="-ml-0.5 flex-1 border-2 border-border bg-surface px-2 py-2.5 first:ml-0"
          >
            <Skeleton className="h-6 w-8" />
            <Skeleton className="mt-1.5 h-3 w-16" />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2.5 border-2 border-teal bg-highlight-bg px-3 py-2.5">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-10" />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <SlotCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
