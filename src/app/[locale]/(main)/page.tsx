import { Suspense } from "react";
import { PredictionsContent } from "@/components/predictions/predictions-content";
import { PredictionsSkeleton } from "@/components/predictions/predictions-skeleton";

type HomePageProps = {
  searchParams: Promise<{ view?: string }>;
};

export default function HomePage({ searchParams }: HomePageProps) {
  return (
    <Suspense fallback={<PredictionsSkeleton />}>
      <PredictionsContent searchParams={searchParams} />
    </Suspense>
  );
}
