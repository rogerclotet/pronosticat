import { getTranslations } from "next-intl/server";
import {
  toBoardMatch,
  toBoardRound,
  toEntryView,
} from "@/components/challenges/types";
import { PredictionsView } from "@/components/predictions/predictions-view";
import {
  getCachedActiveGroup,
  getCachedPredictionRoundBoard,
  getCachedRoundBoard,
  getCachedSession,
  getCachedUserEntries,
} from "@/lib/queries/cached";
import { getCopyableSourceGroups } from "@/lib/queries/groups";
import { getMatchdayHistory } from "@/lib/queries/stats";

type PredictionsContentProps = {
  searchParams: Promise<{ view?: string }>;
};

type RoundView = "upcoming" | "previous";

function normalizeRoundView(value: string | undefined): RoundView {
  return value === "previous" ? "previous" : "upcoming";
}

export async function PredictionsContent({ searchParams }: PredictionsContentProps) {
  const session = await getCachedSession();
  if (!session) return null;

  const activeGroup = await getCachedActiveGroup(session.user.id);
  if (!activeGroup) return null;

  const [{ view }, predictionBoard, currentBoard] = await Promise.all([
    searchParams,
    getCachedPredictionRoundBoard(activeGroup.competition),
    getCachedRoundBoard(activeGroup.competition),
  ]);
  const selectedView = normalizeRoundView(view);
  const hasPreviousRound =
    !!predictionBoard &&
    !!currentBoard &&
    predictionBoard.round.id !== currentBoard.round.id;
  const board =
    hasPreviousRound && selectedView === "previous"
      ? currentBoard
      : predictionBoard ?? currentBoard;
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
      // Matchday numbers repeat every season, so the round in play is
      // identified by both — otherwise last season's matchday 7 vanishes
      // from the history alongside this season's.
      history={history.filter(
        (row) =>
          row.season !== board.round.season ||
          row.matchday !== board.round.matchday,
      )}
      roundView={hasPreviousRound && selectedView === "previous" ? "previous" : "upcoming"}
      showRoundToggle={hasPreviousRound}
      groupId={activeGroup.id}
      competition={activeGroup.competition}
      copySources={copySources}
    />
  );
}
