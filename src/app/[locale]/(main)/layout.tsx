import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getCommittedPoints } from "@/lib/actions/stats";
import {
  getCachedActiveGroup,
  getCachedMemberPoints,
  getCachedSession,
} from "@/lib/queries/cached";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCachedSession();
  if (!session) {
    redirect("/login");
  }

  const activeGroup = await getCachedActiveGroup(session.user.id);
  if (!activeGroup) {
    redirect("/onboarding");
  }

  const [balance, committedPoints] = await Promise.all([
    getCachedMemberPoints(session.user.id, activeGroup.id),
    getCommittedPoints(session.user.id, activeGroup.id),
  ]);

  return (
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
  );
}
