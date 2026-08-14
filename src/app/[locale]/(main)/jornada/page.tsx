import { Suspense } from "react";
import { JornadaContent } from "@/components/jornada/jornada-content";
import { JornadaSkeleton } from "@/components/jornada/jornada-skeleton";

export default function JornadaPage() {
  return (
    <Suspense fallback={<JornadaSkeleton />}>
      <JornadaContent />
    </Suspense>
  );
}
