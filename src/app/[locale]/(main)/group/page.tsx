import { Suspense } from "react";
import { GroupContent } from "@/components/groups/group-content";
import { GroupSkeleton } from "@/components/groups/group-skeleton";

export default function GroupPage() {
  return (
    <Suspense fallback={<GroupSkeleton />}>
      <GroupContent />
    </Suspense>
  );
}
