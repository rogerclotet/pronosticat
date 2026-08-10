import { Skeleton } from "@/components/ui/skeleton";

function MatchCardSkeleton() {
  return (
    <div className="border-2 border-border bg-surface">
      <div className="flex items-center justify-between border-b-2 border-border bg-background px-2.5 py-1.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-14" />
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-2.5 py-3.5">
        <Skeleton className="mx-auto h-9 w-9 rounded-full" />
        <Skeleton className="h-5 w-12" />
        <Skeleton className="mx-auto h-9 w-9 rounded-full" />
      </div>
    </div>
  );
}

export function JornadaSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4 pb-6" aria-busy aria-label="Loading">
      <div className="flex items-baseline justify-between border-b-2 border-border pb-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>

      <div className="border-b-2 border-border pb-2">
        <Skeleton className="h-4 w-32" />
      </div>

      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <MatchCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
