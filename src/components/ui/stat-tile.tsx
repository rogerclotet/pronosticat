import { cn } from "@/lib/utils";

type StatTileProps = {
  label: string;
  value: React.ReactNode;
  accent?: "teal" | "danger" | "default";
  className?: string;
};

const accentClasses = {
  teal: "text-teal",
  danger: "text-danger",
  default: "text-foreground",
};

export function StatTile({
  label,
  value,
  accent = "default",
  className,
}: StatTileProps) {
  return (
    <div
      className={cn("border-2 border-border bg-surface px-2 py-2.5", className)}
    >
      <p
        className={cn(
          "font-mono text-lg font-bold tabular-nums",
          accentClasses[accent],
        )}
      >
        {value}
      </p>
      <p className="label-mono mt-1.5">{label}</p>
    </div>
  );
}
