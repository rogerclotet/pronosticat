"use client";

type TopBarProps = {
  groupName: string;
  onOpenGroups: () => void;
};

export function TopBar({ groupName, onOpenGroups }: TopBarProps) {
  return (
    <div className="border-b-2 border-border bg-header-bg">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 pb-3 pt-6">
        <span className="font-sans text-lg font-extrabold uppercase tracking-tight">
          Pronosticat
        </span>
        <button
          type="button"
          onClick={onOpenGroups}
          className="flex items-center gap-1.5 border-2 border-border bg-surface px-2.5 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.11em] text-muted"
        >
          <span>{groupName}</span>
          <span className="text-teal">▾</span>
        </button>
      </div>
    </div>
  );
}
