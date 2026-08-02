"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", key: "jornada", icon: JornadaIcon },
  { href: "/predictions", key: "predictions", icon: PredictionsIcon },
  { href: "/group", key: "group", icon: GroupIcon },
  { href: "/perfil", key: "perfil", icon: PerfilIcon },
] as const;

export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-border bg-header-bg">
      <div className="mx-auto flex max-w-lg">
        {navItems.map(({ href, key, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              key={key}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1.5 border-t-[3px] py-3",
                isActive ? "border-teal text-foreground" : "border-transparent text-muted",
              )}
            >
              <Icon active={isActive} />
              <span className="max-w-full truncate px-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.09em]">
                {t(key)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function JornadaIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="17" strokeWidth="2" />
      <path d="M3 9h18" />
      <path d="M8 3v3M16 3v3" />
      {active && <circle cx="12" cy="14" r="2" fill="currentColor" stroke="none" />}
    </svg>
  );
}

function PredictionsIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function GroupIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      {active && <line x1="3" y1="21" x2="21" y2="21" />}
    </svg>
  );
}

function PerfilIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" />
    </svg>
  );
}
