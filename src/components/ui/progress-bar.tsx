import { cn } from "@/lib/utils";

type ProgressBarProps = {
  /** Single-fill mode: one bar, width = pct, on a bordered track. */
  pct: number;
  color?: "teal" | "muted";
  className?: string;
};

export function ProgressBar({
  pct,
  color = "muted",
  className,
}: ProgressBarProps) {
  return (
    <div
      className={cn("h-1.5 border border-border bg-highlight-bg", className)}
    >
      <div
        className={cn(
          "h-full",
          color === "teal" ? "bg-teal" : "bg-border-strong",
        )}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

type SegmentedBarProps = {
  /** Multi-segment mode (Perfil history): segments filling left-to-right, remainder left transparent. */
  segments: { pct: number; tone: "hit" | "partial" }[];
  className?: string;
};

const segmentTone = {
  hit: "bg-teal",
  partial: "bg-teal-dark/60",
};

export function SegmentedBar({ segments, className }: SegmentedBarProps) {
  return (
    <div className={cn("flex h-2 border-t-2 border-border", className)}>
      {segments.map((s, i) => (
        <div
          key={i}
          className={segmentTone[s.tone]}
          style={{ width: `${Math.max(0, Math.min(100, s.pct))}%` }}
        />
      ))}
      <div className="flex-1 bg-surface-hover" />
    </div>
  );
}
