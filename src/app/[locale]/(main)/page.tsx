import { Suspense } from "react";
import { PredictionsContent } from "@/components/predictions/predictions-content";
import { PredictionsSkeleton } from "@/components/predictions/predictions-skeleton";

export default function HomePage() {
  return (
    <Suspense fallback={<PredictionsSkeleton />}>
      <PredictionsContent />
    </Suspense>
  );
}
