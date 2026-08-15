import "server-only";

import { lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { pushDispatches, session, verification } from "@/lib/db/schema";

/**
 * A dispatch row only exists to stop a second cron tick re-sending the same
 * notification. Once the event it guards is long past, the row is dead weight.
 */
const DISPATCH_RETENTION_DAYS = 30;

function daysAgo(days: number, now: Date): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

/** Housekeeping for tables that only ever grow. Safe to run on every tick. */
export async function pruneExpiredRows(now = new Date()) {
  await db
    .delete(pushDispatches)
    .where(lt(pushDispatches.sentAt, daysAgo(DISPATCH_RETENTION_DAYS, now)));

  // Expired rows are already refused at auth time; this just reclaims space.
  await db.delete(session).where(lt(session.expiresAt, now));
  await db.delete(verification).where(lt(verification.expiresAt, now));
}
