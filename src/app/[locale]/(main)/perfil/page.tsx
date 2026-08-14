import { Suspense } from "react";
import { ProfileContent } from "@/components/profile/profile-content";
import { ProfileSkeleton } from "@/components/profile/profile-skeleton";

export default function PerfilPage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent />
    </Suspense>
  );
}
