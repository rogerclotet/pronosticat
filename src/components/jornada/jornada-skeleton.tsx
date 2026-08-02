import { Skeleton } from "@/components/ui/skeleton";

function MatchCardSkeleton() {
  return (
    <div className="border-2 border-border bg-surface">
      <div className="flex items-center justify-between border-b-2 border-border bg-background px-2.5 py-1.5">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-14" />
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-2.5 py-3.5">
        <div className="flex flex-col items-center gap-1.5">
          <Skeleton className="h-[38px] w-[38px]" />
          <Skeleton className="h-3 w-14" />
        </div>
        <Skeleton className="h-5 w-10" />
        <div className="flex flex-col items-center gap-1.5">
          <Skeleton className="h-[38px] w-[38px]" />
          <Skeleton className="h-3 w-14" />
        </div>
      </div>
      <div className="border-t-2 border-border px-2.5 py-2.5">
        <Skeleton className="h-4 w-full" />
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

      <div className="flex items-center justify-between gap-2.5 border-2 border-teal bg-highlight-bg px-3 py-2.5">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-10" />
      </div>

      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <MatchCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
