import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

const variants = {
  primary: "bg-teal text-background border-2 border-teal hover:bg-teal-dark",
  secondary:
    "bg-surface text-foreground border-2 border-border hover:bg-surface-hover",
  ghost: "bg-transparent text-foreground border-2 border-transparent hover:border-border",
  danger: "bg-transparent text-danger border-2 border-danger/50 hover:bg-danger/10",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "font-bold uppercase tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
