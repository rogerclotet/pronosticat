import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getCachedActiveGroup, getCachedSession } from "@/lib/queries/cached";

/**
 * Session-gated chrome. Split out of the layout so the layout itself stays
 * prerenderable and this part streams in behind a Suspense boundary.
 */
export async function MainChrome({ children }: { children: React.ReactNode }) {
  const session = await getCachedSession();
  if (!session) {
    redirect("/login");
  }

  const activeGroup = await getCachedActiveGroup(session.user.id);
  if (!activeGroup) {
    redirect("/onboarding");
  }

  return (
    <AppShell groupName={activeGroup.name} activeGroupId={activeGroup.id}>
      {children}
    </AppShell>
  );
}
