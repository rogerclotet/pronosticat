import "server-only";

import { and, eq } from "drizzle-orm";
import { generateId } from "@/lib/constants";
import { db } from "@/lib/db";
import { pushDispatches, pushSubscriptions } from "@/lib/db/schema";
import { sendPushToUser } from "./send";
import type { PushKind, PushPayload } from "./types";
import { isPushConfigured } from "./vapid";

export const COMPETITION_LABEL: Record<string, string> = {
  laliga: "LaLiga",
  premier_league: "Premier League",
  champions_league: "Champions League",
};

export function competitionLabel(competition: string): string {
  return COMPETITION_LABEL[competition] ?? competition;
}

export async function subscribedUserIds(): Promise<Set<string>> {
  const rows = await db
    .selectDistinct({ userId: pushSubscriptions.userId })
    .from(pushSubscriptions);
  return new Set(rows.map((row) => row.userId));
}

async function claimDispatch(
  userId: string,
  kind: PushKind,
  entityId: string,
): Promise<boolean> {
  const inserted = await db
    .insert(pushDispatches)
    .values({
      id: generateId(),
      userId,
      kind,
      entityId,
    })
    .onConflictDoNothing()
    .returning({ id: pushDispatches.id });
  return inserted.length > 0;
}

async function releaseDispatch(
  userId: string,
  kind: PushKind,
  entityId: string,
) {
  await db
    .delete(pushDispatches)
    .where(
      and(
        eq(pushDispatches.userId, userId),
        eq(pushDispatches.kind, kind),
        eq(pushDispatches.entityId, entityId),
      ),
    );
}

export async function notifyUser(input: {
  userId: string;
  kind: PushKind;
  entityId: string;
  payload: PushPayload;
}) {
  if (!isPushConfigured()) return;
  if (!(await claimDispatch(input.userId, input.kind, input.entityId))) {
    return;
  }

  const { sent, failed } = await sendPushToUser(input.userId, input.payload);
  if (sent === 0 && failed > 0) {
    await releaseDispatch(input.userId, input.kind, input.entityId);
  }
}
