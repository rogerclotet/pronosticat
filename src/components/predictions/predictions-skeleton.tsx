import { Skeleton } from "@/components/ui/skeleton";

function PredictionRowSkeleton() {
  return (
    <div className="border-2 border-border bg-surface">
      <div className="flex items-center justify-between gap-2 border-b-2 border-border bg-background px-2.5 py-1.5">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-14" />
      </div>
      <div className="flex items-center justify-between gap-2.5 p-2.5">
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-8 w-12" />
        <Skeleton className="h-4 w-14" />
      </div>
    </div>
  );
}

export function PredictionsSkeleton() {
  return (
    <div className="flex flex-col gap-3.5 p-4 pb-6" aria-busy aria-label="Loading">
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

      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <PredictionRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
