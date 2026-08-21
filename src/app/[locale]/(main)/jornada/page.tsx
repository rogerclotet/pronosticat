import { Suspense } from "react";
import { JornadaContent } from "@/components/jornada/jornada-content";
import { JornadaSkeleton } from "@/components/jornada/jornada-skeleton";

type JornadaPageProps = {
  searchParams: Promise<{ round?: string }>;
};

export default function JornadaPage({ searchParams }: JornadaPageProps) {
  return (
    <Suspense fallback={<JornadaSkeleton />}>
      <JornadaContent searchParams={searchParams} />
    </Suspense>
  );
}
