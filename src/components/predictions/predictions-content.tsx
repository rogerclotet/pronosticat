import { getTranslations } from "next-intl/server";
import { PredictionsView } from "@/components/predictions/predictions-view";
import {
  toBoardMatch,
  toBoardRound,
  toEntryView,
} from "@/components/challenges/types";
import { getMatchdayHistory } from "@/lib/queries/stats";
import {
  getCachedActiveGroup,
  getCachedRoundBoard,
  getCachedSession,
  getCachedUserEntries,
} from "@/lib/queries/cached";

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

  const [entries, history] = await Promise.all([
    getCachedUserEntries(session.user.id, activeGroup.id, board.round.id),
    getMatchdayHistory(session.user.id, activeGroup.id),
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
    />
  );
}
