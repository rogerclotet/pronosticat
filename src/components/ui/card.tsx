import { cn } from "@/lib/utils";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  padding?: "sm" | "md" | "lg";
};

const paddings = {
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export function Card({
  className,
  padding = "md",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "border-2 border-border bg-surface",
        paddings[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
