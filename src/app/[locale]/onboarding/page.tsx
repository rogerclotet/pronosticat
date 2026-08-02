import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { mode } = await searchParams;

  return <OnboardingWizard initialMode={mode === "join" ? "join" : "create"} />;
}
