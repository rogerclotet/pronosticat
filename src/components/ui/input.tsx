import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "w-full border-2 border-border bg-background px-4 py-2 text-foreground placeholder:text-muted focus:border-teal focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}
