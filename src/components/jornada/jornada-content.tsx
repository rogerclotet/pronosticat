import { getTranslations } from "next-intl/server";
import { ChallengeBoard } from "@/components/challenges/challenge-board";
import { toBoardMatch, toBoardRound } from "@/components/challenges/types";
import {
  getCachedActiveGroup,
  getCachedRoundBoard,
  getCachedSession,
} from "@/lib/queries/cached";

export async function JornadaContent() {
  const session = await getCachedSession();
  if (!session) return null;

  const activeGroup = await getCachedActiveGroup(session.user.id);
  if (!activeGroup) return null;

  const board = await getCachedRoundBoard(activeGroup.competition);
  if (!board) {
    const t = await getTranslations("board");
    return <p className="p-4 text-sm text-muted">{t("notReady")}</p>;
  }

  return (
    <ChallengeBoard
      round={toBoardRound(board.round)}
      matches={board.matches.map(toBoardMatch)}
      competition={activeGroup.competition}
    />
  );
}
