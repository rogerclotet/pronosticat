import { getTranslations } from "next-intl/server";
import { ChallengeBoard } from "@/components/challenges/challenge-board";
import { toBoardMatch, toBoardRound } from "@/components/challenges/types";
import {
  getCachedActiveGroup,
  getCachedResultsRoundBoard,
  getCachedSession,
} from "@/lib/queries/cached";

type JornadaContentProps = {
  searchParams: Promise<{ round?: string }>;
};

export async function JornadaContent({ searchParams }: JornadaContentProps) {
  const session = await getCachedSession();
  if (!session) return null;

  const activeGroup = await getCachedActiveGroup(session.user.id);
  if (!activeGroup) return null;

  // An unknown or not-yet-started round id falls back to the latest round.
  const { round: requestedRoundId } = await searchParams;
  const results = await getCachedResultsRoundBoard(
    activeGroup.competition,
    requestedRoundId,
  );
  if (!results) {
    const t = await getTranslations("board");
    return <p className="p-4 text-sm text-muted">{t("notReady")}</p>;
  }

  const { board, options } = results;

  return (
    <ChallengeBoard
      round={toBoardRound(board.round)}
      matches={board.matches.map(toBoardMatch)}
      competition={activeGroup.competition}
      roundOptions={options}
    />
  );
}
