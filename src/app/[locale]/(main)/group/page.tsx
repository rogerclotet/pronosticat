import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/session";
import {
  getActiveGroup,
  getUserGroups,
  getGroupMembers,
} from "@/lib/actions/groups";
import { GroupPageClient } from "@/components/groups/group-page-client";

export default async function GroupPage() {
  const session = await getSession();
  if (!session) return null;

  const t = await getTranslations();
  const activeGroup = await getActiveGroup(session.user.id);
  const userGroups = await getUserGroups(session.user.id);
  const members = activeGroup
    ? await getGroupMembers(activeGroup.id)
    : [];

  return (
    <GroupPageClient
      activeGroup={
        activeGroup
          ? {
              id: activeGroup.id,
              name: activeGroup.name,
              competition: activeGroup.competition,
              inviteCode: activeGroup.inviteCode,
              startingPoints: activeGroup.startingPoints,
            }
          : null
      }
      groups={userGroups.map((g) => ({
        id: g.id,
        name: g.name,
        competition: g.competition,
        points: g.points,
        isAdmin: g.isAdmin,
      }))}
      members={members.map((m) => ({
        id: m.id,
        name: m.user.name,
        points: m.points,
        isAdmin: m.isAdmin,
      }))}
      labels={{
        title: t("group.title"),
        yourGroups: t("group.yourGroups"),
        create: t("group.create"),
        join: t("group.join"),
        members: t("group.members"),
        inviteCode: t("group.inviteCode"),
        copyCode: t("group.copyCode"),
        codeCopied: t("group.codeCopied"),
        startingPoints: t("group.startingPoints"),
      }}
    />
  );
}
