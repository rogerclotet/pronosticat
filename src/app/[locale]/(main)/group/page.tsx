import { Suspense } from "react";
import { GroupSkeleton } from "@/components/groups/group-skeleton";
import { GroupContent } from "@/components/groups/group-content";

export default function GroupPage() {
  return (
    <Suspense fallback={<GroupSkeleton />}>
      <GroupContent />
    </Suspense>
  );
}
