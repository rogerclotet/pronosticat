import { Suspense } from "react";
import { AppShellSkeleton } from "@/components/layout/app-shell-skeleton";
import { MainChrome } from "@/components/layout/main-chrome";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <MainChrome>{children}</MainChrome>
    </Suspense>
  );
}
