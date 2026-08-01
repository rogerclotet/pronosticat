import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AppShell } from "@/components/layout/app-shell";
import { getActiveGroup } from "@/lib/actions/groups";

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

  return (
    <AppShell groupName={activeGroup?.name}>{children}</AppShell>
  );
}
