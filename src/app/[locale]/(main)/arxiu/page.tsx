import { Suspense } from "react";
import { ArchiveContent } from "@/components/archive/archive-content";
import { ArchiveSkeleton } from "@/components/archive/archive-skeleton";

export default function ArchivePage() {
  return (
    <Suspense fallback={<ArchiveSkeleton />}>
      <ArchiveContent />
    </Suspense>
  );
}
