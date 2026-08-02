import { Suspense } from "react";
import { JornadaSkeleton } from "@/components/jornada/jornada-skeleton";
import { JornadaContent } from "@/components/jornada/jornada-content";

export default function JornadaPage() {
  return (
    <Suspense fallback={<JornadaSkeleton />}>
      <JornadaContent />
    </Suspense>
  );
}
