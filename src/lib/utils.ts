export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function teamCode(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return words.slice(0, 3).map((w) => w[0]).join("").toUpperCase();
  }
  return name.slice(0, 3).toUpperCase();
}

export function formatKickoff(date: Date): string {
  return date.toLocaleDateString("ca-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
