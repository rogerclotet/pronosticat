import { cn } from "@/lib/utils";

type PillTone = "open" | "live" | "muted" | "teal" | "danger";

const toneClasses: Record<PillTone, string> = {
  open: "bg-highlight-bg text-teal",
  live: "bg-[#C9564E] text-background",
  muted: "bg-surface-hover text-muted",
  teal: "bg-highlight-bg text-teal",
  danger: "bg-highlight-bg text-danger",
};

type PillProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: PillTone;
};

export function Pill({
  tone = "muted",
  className,
  children,
  ...props
}: PillProps) {
  return (
    <span
      className={cn(
        "font-mono text-[9px] font-bold uppercase tracking-[0.12em] px-1.5 py-1",
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
