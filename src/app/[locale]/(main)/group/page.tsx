import { getSession } from "@/lib/session";
import { getActiveGroup, getStandings, getGroupMembers } from "@/lib/actions/groups";
import { GroupTabView } from "@/components/groups/group-tab-view";

export default async function GroupPage() {
  const session = await getSession();
  if (!session) return null;

  const activeGroup = await getActiveGroup(session.user.id);
  if (!activeGroup) return null;

  const [standings, members] = await Promise.all([
    getStandings(activeGroup.id),
    getGroupMembers(activeGroup.id),
  ]);

  const viewer = members.find((m) => m.userId === session.user.id);

  return (
    <GroupTabView
      standings={standings.map((s) => ({
        userId: s.userId,
        name: s.name,
        points: s.points,
        matchesPredicted: s.matchesPredicted,
        correctResults: Number(s.correctResults),
        correctOutcomes: Number(s.correctOutcomes),
      }))}
      activeGroup={{
        id: activeGroup.id,
        name: activeGroup.name,
        competition: activeGroup.competition,
        inviteCode: activeGroup.inviteCode,
      }}
      memberCount={members.length}
      viewerIsAdmin={viewer?.isAdmin ?? false}
      viewerUserId={session.user.id}
    />
  );
}
