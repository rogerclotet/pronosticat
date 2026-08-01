"use client";

import { useTranslations } from "next-intl";
import { setActiveGroup } from "@/lib/actions/groups";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Competition } from "@/lib/constants";

type GroupListProps = {
  groups: Array<{
    id: string;
    name: string;
    competition: Competition;
    points: number;
    isAdmin: boolean;
  }>;
  activeGroupId?: string;
};

export function GroupList({ groups, activeGroupId }: GroupListProps) {
  const t = useTranslations("group");

  async function handleSwitch(groupId: string) {
    await setActiveGroup(groupId);
  }

  return (
    <div className="space-y-2">
      {groups.map((group) => (
        <Card
          key={group.id}
          className={cn(
            "cursor-pointer transition-colors hover:bg-surface-hover",
            group.id === activeGroupId && "border-teal",
          )}
          onClick={() => handleSwitch(group.id)}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold">{group.name}</h3>
              <p className="text-xs text-muted">
                {t(`competitions.${group.competition}`)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-teal">{group.points}</p>
              <p className="text-xs text-muted">pts</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
