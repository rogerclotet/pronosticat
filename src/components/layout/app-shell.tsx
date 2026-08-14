"use client";

import { useSearchParams } from "next/navigation";
import { GroupsSheet } from "@/components/groups/groups-sheet";
import { RivalSheet } from "@/components/groups/rival-sheet";
import { PushPermissionPrompt } from "@/components/push/push-permission-prompt";
import { usePathname, useRouter } from "@/i18n/routing";
import { BottomNav } from "./bottom-nav";
import { TopBar } from "./top-bar";

type AppShellProps = {
  children: React.ReactNode;
  groupName: string;
  activeGroupId: string;
};

export function AppShell({
  children,
  groupName,
  activeGroupId,
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
    <div className="flex min-h-dvh flex-1 flex-col bg-background">
      <TopBar
        groupName={groupName}
        onOpenGroups={() => router.push(`${pathname}?sheet=groups`)}
      />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col bg-background pb-20">
        {children}
      </main>
      <BottomNav />

      {sheet === "groups" ? (
        <GroupsSheet
          isOpen
          onClose={closeSheet}
          activeGroupId={activeGroupId}
        />
      ) : null}
      {rivalId && (
        <RivalSheet
          // Remount per rival so a previous rival's data never shows through.
          key={rivalId}
          isOpen={sheet === "rival"}
          onClose={closeSheet}
          groupId={activeGroupId}
          rivalUserId={rivalId}
        />
      )}
      <PushPermissionPrompt />
    </div>
  );
}
