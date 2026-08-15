import { getTranslations } from "next-intl/server";
import { ArchiveView } from "@/components/archive/archive-view";
import { getSeasonArchive } from "@/lib/queries/archive";
import { getCachedActiveGroup, getCachedSession } from "@/lib/queries/cached";

export async function ArchiveContent() {
  const session = await getCachedSession();
  if (!session) return null;

  const activeGroup = await getCachedActiveGroup(session.user.id);
  if (!activeGroup) return null;

  const seasons = await getSeasonArchive(
    activeGroup.id,
    activeGroup.competition,
    session.user.id,
  );

  if (seasons.length === 0) {
    const t = await getTranslations("archive");
    return <p className="p-4 text-sm text-muted">{t("empty")}</p>;
  }

  return (
    <ArchiveView
      seasons={seasons}
      competition={activeGroup.competition}
      viewerUserId={session.user.id}
    />
  );
}
