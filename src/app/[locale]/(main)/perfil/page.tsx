import { Suspense } from "react";
import { ProfileSkeleton } from "@/components/profile/profile-skeleton";
import { ProfileContent } from "@/components/profile/profile-content";

export default function PerfilPage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent />
    </Suspense>
  );
}
