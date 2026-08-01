"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", key: "home", icon: HomeIcon },
  { href: "/predictions", key: "predictions", icon: PredictionsIcon },
  { href: "/standings", key: "standings", icon: StandingsIcon },
  { href: "/group", key: "group", icon: GroupIcon, dynamicLabel: true },
] as const;

type BottomNavProps = {
  groupName?: string;
};

export function BottomNav({ groupName }: BottomNavProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-border bg-background">
      <div className="mx-auto flex max-w-lg">
        {navItems.map(({ href, key, icon: Icon, ...rest }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          const label =
            "dynamicLabel" in rest && rest.dynamicLabel && groupName
              ? groupName
              : t(key);

          return (
            <Link
              key={key}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 border-r-2 border-border py-3 last:border-r-0",
                isActive ? "bg-surface text-teal" : "text-muted hover:text-foreground",
              )}
            >
              <Icon active={isActive} />
              <span className="max-w-full truncate px-1 text-[10px] font-bold uppercase tracking-wider">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function PredictionsIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function StandingsIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function GroupIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}
