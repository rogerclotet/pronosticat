import { Suspense } from "react";
import { PredictionsSkeleton } from "@/components/predictions/predictions-skeleton";
import { PredictionsContent } from "@/components/predictions/predictions-content";

export default function PredictionsPage() {
  return (
    <Suspense fallback={<PredictionsSkeleton />}>
      <PredictionsContent />
    </Suspense>
  );
}
