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
  const datePart = date.toLocaleDateString("ca-ES", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
  const timePart = date.toLocaleTimeString("ca-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return `${datePart}, ${timePart}`;
}
