/**
 * Class names, skipping anything falsy. Also takes a `{ class: condition }`
 * record, which is what upstream shadcn components are written against.
 */
export type ClassValue =
  | string
  | undefined
  | null
  | false
  | Record<string, boolean | undefined>;

export function cn(...classes: ClassValue[]): string {
  const out: string[] = [];
  for (const entry of classes) {
    if (!entry) continue;
    if (typeof entry === "string") {
      out.push(entry);
      continue;
    }
    for (const [name, enabled] of Object.entries(entry)) {
      if (enabled) out.push(name);
    }
  }
  return out.join(" ");
}

export function teamCode(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return words
      .slice(0, 3)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  }
  return name.slice(0, 3).toUpperCase();
}

export function formatOrdinal(n: number): string {
  switch (n) {
    case 1:
      return "1r";
    case 2:
      return "2n";
    case 3:
      return "3r";
    case 4:
      return "4t";
    default:
      return `${n}è`;
  }
}

const KICKOFF_TIME_ZONE = "Europe/Madrid";

export function formatKickoff(date: Date): string {
  const datePart = date.toLocaleDateString("ca-ES", {
    weekday: "short",
    day: "numeric",
    month: "long",
    timeZone: KICKOFF_TIME_ZONE,
  });
  const timePart = date.toLocaleTimeString("ca-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: KICKOFF_TIME_ZONE,
  });
  // Intl emits a curly apostrophe ("d’agost"); normalize to the straight
  // apostrophe used everywhere else in the app's copy.
  return `${datePart}, ${timePart}`.replace(/’/g, "'");
}
