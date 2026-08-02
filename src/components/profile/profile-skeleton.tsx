import { Skeleton } from "@/components/ui/skeleton";

export function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-3.5 p-4 pb-6" aria-busy aria-label="Loading">
      <div className="border-b-2 border-border pb-2">
        <Skeleton className="h-5 w-24" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border-2 border-border bg-surface px-2 py-2.5">
            <Skeleton className="h-6 w-10" />
            <Skeleton className="mt-1.5 h-3 w-16" />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border-2 border-border bg-surface p-2.5">
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
