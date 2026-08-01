"use client";

import { useState } from "react";
import { GroupForm } from "@/components/groups/group-form";
import { GroupList } from "@/components/groups/group-list";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/routing";
import { authClient } from "@/lib/auth-client";
import type { Competition } from "@/lib/constants";

type GroupPageClientProps = {
  activeGroup: {
    id: string;
    name: string;
    competition: Competition;
    inviteCode: string;
    startingPoints: number;
  } | null;
  groups: Array<{
    id: string;
    name: string;
    competition: Competition;
    points: number;
    isAdmin: boolean;
  }>;
  members: Array<{
    id: string;
    name: string;
    points: number;
    isAdmin: boolean;
  }>;
  labels: {
    title: string;
    yourGroups: string;
    create: string;
    join: string;
    members: string;
    inviteCode: string;
    copyCode: string;
    codeCopied: string;
    startingPoints: string;
  };
};

export function GroupPageClient({
  activeGroup,
  groups,
  members,
  labels,
}: GroupPageClientProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"list" | "create" | "join">("list");
  const [copied, setCopied] = useState(false);

  async function handleSignOut() {
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  async function handleCopyCode() {
    if (!activeGroup) return;
    await navigator.clipboard.writeText(activeGroup.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-black uppercase tracking-tight">
          {labels.title}
        </h1>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          Sortir
        </Button>
      </header>

      {activeGroup && mode === "list" && (
        <Card className="space-y-3">
          <h2 className="text-lg font-black uppercase">{activeGroup.name}</h2>
          <div className="flex items-center justify-between border-t-2 border-border pt-3">
            <span className="text-xs uppercase text-muted">
              {labels.inviteCode}
            </span>
            <button
              onClick={handleCopyCode}
              className="font-mono text-lg font-bold text-teal"
            >
              {copied ? labels.codeCopied : activeGroup.inviteCode}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase text-muted">
              {labels.startingPoints}
            </span>
            <span className="font-bold">{activeGroup.startingPoints}</span>
          </div>
        </Card>
      )}

      {mode === "list" && groups.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider">
            {labels.yourGroups}
          </h2>
          <GroupList groups={groups} activeGroupId={activeGroup?.id} />
        </section>
      )}

      {mode === "list" && activeGroup && members.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider">
            {labels.members}
          </h2>
          <div className="space-y-2">
            {members.map((m) => (
              <Card key={m.id} className="flex items-center justify-between">
                <span className="font-bold">
                  {m.name}
                  {m.isAdmin && (
                    <span className="ml-2 text-xs text-teal">ADMIN</span>
                  )}
                </span>
                <span className="font-bold tabular-nums text-teal">
                  {m.points}
                </span>
              </Card>
            ))}
          </div>
        </section>
      )}

      {mode === "create" && (
        <GroupForm mode="create" onSuccess={() => setMode("list")} />
      )}

      {mode === "join" && (
        <GroupForm mode="join" onSuccess={() => setMode("list")} />
      )}

      {mode === "list" && (
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => setMode("create")}>
            {labels.create}
          </Button>
          <Button
            className="flex-1"
            variant="secondary"
            onClick={() => setMode("join")}
          >
            {labels.join}
          </Button>
        </div>
      )}

      {mode !== "list" && (
        <Button variant="ghost" onClick={() => setMode("list")}>
          ← Torna
        </Button>
      )}
    </div>
  );
}
