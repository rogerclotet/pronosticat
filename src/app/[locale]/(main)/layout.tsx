import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AppShell } from "@/components/layout/app-shell";
import { getActiveGroup, getMemberPoints } from "@/lib/actions/groups";
import { getCommittedPoints } from "@/lib/actions/stats";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const activeGroup = await getActiveGroup(session.user.id);
  if (!activeGroup) {
    redirect("/onboarding");
  }

  const [balance, committedPoints] = await Promise.all([
    getMemberPoints(session.user.id, activeGroup.id),
    getCommittedPoints(session.user.id, activeGroup.id),
  ]);

  return (
    <Suspense fallback={null}>
      <AppShell
        groupName={activeGroup.name}
        balance={balance}
        committedPoints={committedPoints}
        userId={session.user.id}
        activeGroupId={activeGroup.id}
        competition={activeGroup.competition}
      >
        {children}
      </AppShell>
    </Suspense>
  );
}
