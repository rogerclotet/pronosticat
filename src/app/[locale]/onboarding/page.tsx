import { redirect } from "next/navigation";
import { Suspense } from "react";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { getSession } from "@/lib/session";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <Suspense fallback={null}>
      <OnboardingWizard />
    </Suspense>
  );
}
