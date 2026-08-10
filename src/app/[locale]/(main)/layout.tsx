import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getCachedActiveGroup, getCachedSession } from "@/lib/queries/cached";

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

  return (
    <AppShell
      groupName={activeGroup.name}
      userId={session.user.id}
      activeGroupId={activeGroup.id}
      competition={activeGroup.competition}
    >
      {children}
    </AppShell>
  );
}
