import { getTranslations } from "next-intl/server";
import {
  toBoardMatch,
  toBoardRound,
  toEntryView,
} from "@/components/challenges/types";
import { PredictionsView } from "@/components/predictions/predictions-view";
import {
  getCachedActiveGroup,
  getCachedRoundBoard,
  getCachedSession,
  getCachedUserEntries,
} from "@/lib/queries/cached";
import { getCopyableSourceGroups } from "@/lib/queries/groups";
import { getMatchdayHistory } from "@/lib/queries/stats";

export async function PredictionsContent() {
  const session = await getCachedSession();
  if (!session) return null;

  const activeGroup = await getCachedActiveGroup(session.user.id);
  if (!activeGroup) return null;

  const board = await getCachedRoundBoard(activeGroup.competition);
  if (!board) {
    const t = await getTranslations("board");
    return <p className="p-4 text-sm text-muted">{t("notReady")}</p>;
  }

  const [entries, history, copySources] = await Promise.all([
    getCachedUserEntries(session.user.id, activeGroup.id, board.round.id),
    getMatchdayHistory(session.user.id, activeGroup.id),
    board.round.status === "open"
      ? getCopyableSourceGroups(
          session.user.id,
          activeGroup.id,
          activeGroup.competition,
          board.round.id,
        )
      : Promise.resolve([]),
  ]);

  return (
    <PredictionsView
      round={toBoardRound(board.round)}
      slots={board.slots}
      matches={board.matches.map(toBoardMatch)}
      entries={entries.map(toEntryView)}
      history={history.filter((row) => row.matchday !== board.round.matchday)}
      groupId={activeGroup.id}
      competition={activeGroup.competition}
      copySources={copySources}
    />
  );
}
