"use client";

import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/routing";
import { BottomNav } from "./bottom-nav";
import { TopBar } from "./top-bar";
import { GroupsSheet } from "@/components/groups/groups-sheet";
import { RivalSheet } from "@/components/groups/rival-sheet";
import type { Competition } from "@/lib/constants";

type AppShellProps = {
  children: React.ReactNode;
  groupName: string;
  balance: number;
  committedPoints: number;
  userId: string;
  activeGroupId: string;
  competition: Competition;
};

export function AppShell({
  children,
  groupName,
  balance,
  committedPoints,
  userId,
  activeGroupId,
  competition,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sheet = searchParams.get("sheet");
  const rivalId = searchParams.get("rival");

  function closeSheet() {
    router.replace(pathname);
  }

  return (
    <div className="flex min-h-full flex-col bg-background">
      <TopBar
        groupName={groupName}
        balance={balance}
        committedPoints={committedPoints}
        onOpenGroups={() => router.push(`${pathname}?sheet=groups`)}
      />
      <main className="mx-auto w-full max-w-lg flex-1 pb-20">{children}</main>
      <BottomNav />

      <GroupsSheet
        isOpen={sheet === "groups"}
        onClose={closeSheet}
        userId={userId}
        activeGroupId={activeGroupId}
      />
      {rivalId && (
        <RivalSheet
          isOpen={sheet === "rival"}
          onClose={closeSheet}
          groupId={activeGroupId}
          competition={competition}
          rivalUserId={rivalId}
        />
      )}
    </div>
  );
}
