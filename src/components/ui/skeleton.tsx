import { cn } from "@/lib/utils";

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("animate-pulse bg-border/60", className)} aria-hidden />
  );
}
