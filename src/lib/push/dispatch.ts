import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  lte,
  sql,
} from "drizzle-orm";
import { scoreEntry } from "@/lib/challenges/score";
import { COMPETITIONS, type Competition } from "@/lib/constants";
import { db } from "@/lib/db";
import {
  entries,
  groupMembers,
  groups,
  matches,
  roundChallenges,
  rounds,
  user,
} from "@/lib/db/schema";
import type { EmailRecipient } from "@/lib/email/recipients";
import { emailOptedInUsers } from "@/lib/email/recipients";
import { appBaseUrl, isEmailConfigured, sendEmail } from "@/lib/email/send";
import { deadlineEmail, roundSettledEmail } from "@/lib/email/templates";
import { unsubscribeUrl } from "@/lib/email/unsubscribe";
import { liveGroup } from "@/lib/queries/groups";
import { toScoredSnapshot } from "./live";
import {
  competitionLabel,
  notifyUser,
  notifyUserByEmail,
  subscribedUserIds,
} from "./notify";
import {
  adminEmptyPicksPayload,
  bankerMissedPayload,
  deadlineMovedPayload,
  deadlinePayload,
  exactScoreHitPayload,
  halfTimePayload,
  jokerUnusedPayload,
  matchFinishedPayload,
  matchKickedOffPayload,
  memberJoinedPayload,
  onlyOneEmptyPayload,
  pickLiveSwingPayload,
  pickVoidedPayload,
  rankChangePayload,
  roundOpenPayload,
  roundSettledPayload,
  streakPayload,
  tableExtremePayload,
  titleRacePayload,
} from "./payload";
import { type RankedMember, rankShifts, titleRaceSnapshot } from "./rank";
import { roundHitStreak, streakBroke } from "./streak";
import { PUSH_KINDS } from "./types";
import { isPushConfigured } from "./vapid";
import {
  HALF_TIME_SLUGS,
  isRoundOpenWindow,
  LIVE_SWING_SLUGS,
  matchingDeadlineWindow,
  PUSH_LOOKBACK_MS,
  STREAK_MILESTONES,
  TITLE_RACE_REMAINING,
} from "./windows";

type MemberRow = {
  userId: string;
  groupId: string;
  isAdmin: boolean;
  points: number;
  name: string;
  groupName: string;
  competition: string;
};

async function membersForCompetition(
  competition: Competition,
): Promise<MemberRow[]> {
  return db
    .select({
      userId: groupMembers.userId,
      groupId: groupMembers.groupId,
      isAdmin: groupMembers.isAdmin,
      points: groupMembers.points,
      name: user.name,
      groupName: groups.name,
      competition: groups.competition,
    })
    .from(groupMembers)
    .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    .innerJoin(user, eq(user.id, groupMembers.userId))
    .where(and(eq(groups.competition, competition), liveGroup));
}

async function slotCountFor(roundId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(roundChallenges)
    .where(eq(roundChallenges.roundId, roundId));
  return Number(row?.n ?? 0);
}

async function entryStats(roundId: string) {
  const rows = await db
    .select({
      userId: entries.userId,
      groupId: entries.groupId,
      n: count(),
      jokers: count(sql`case when ${entries.isJoker} then 1 end`),
    })
    .from(entries)
    .where(eq(entries.roundId, roundId))
    .groupBy(entries.userId, entries.groupId);

  const filled = new Map<string, { n: number; jokers: number }>();
  for (const row of rows) {
    filled.set(`${row.userId}:${row.groupId}`, {
      n: Number(row.n),
      jokers: Number(row.jokers),
    });
  }
  return filled;
}

function memberKey(userId: string, groupId: string) {
  return `${userId}:${groupId}`;
}

/** Where the email fallback sends, and the base URL its links point at. */
type EmailFallback = {
  recipients: Map<string, EmailRecipient>;
  baseUrl: string;
};

async function dispatchBoardReminders(
  now: Date,
  subscribed: Set<string>,
  email: EmailFallback | null,
) {
  const open = await db.query.rounds.findMany({
    where: eq(rounds.status, "open"),
    orderBy: [asc(rounds.season), asc(rounds.matchday)],
  });

  const earliestOpen = new Map<string, string>();
  for (const round of open) {
    if (!earliestOpen.has(round.competition)) {
      earliestOpen.set(round.competition, round.id);
    }
  }

  for (const round of open) {
    const windowId = matchingDeadlineWindow(round.lockAt, now);
    const remainingMs = round.lockAt.getTime() - now.getTime();
    const slots = await slotCountFor(round.id);
    if (!slots) continue;

    const members = await membersForCompetition(round.competition);
    const filled = await entryStats(round.id);
    const label = competitionLabel(round.competition);

    if (
      earliestOpen.get(round.competition) === round.id &&
      isRoundOpenWindow(round.lockAt, now)
    ) {
      for (const member of members) {
        if (!subscribed.has(member.userId)) continue;
        const used =
          filled.get(memberKey(member.userId, member.groupId))?.n ?? 0;
        if (used > 0) continue;
        await notifyUser({
          userId: member.userId,
          kind: PUSH_KINDS.roundOpen,
          entityId: `${round.id}:${member.groupId}`,
          payload: roundOpenPayload({
            matchday: round.matchday,
            competitionLabel: label,
            roundId: round.id,
          }),
        });
      }
    }

    if (!windowId) continue;

    const byGroup = new Map<string, MemberRow[]>();
    for (const member of members) {
      const list = byGroup.get(member.groupId);
      if (list) list.push(member);
      else byGroup.set(member.groupId, [member]);
    }

    for (const [groupId, groupMembersList] of byGroup) {
      const incomplete: MemberRow[] = [];
      const empty: MemberRow[] = [];
      const jokerFree: MemberRow[] = [];

      for (const member of groupMembersList) {
        const stats = filled.get(memberKey(member.userId, member.groupId));
        const used = stats?.n ?? 0;
        if (used === 0) empty.push(member);
        if (used < slots) incomplete.push(member);
        else if ((stats?.jokers ?? 0) === 0) jokerFree.push(member);
      }

      const sole = incomplete.length === 1 ? incomplete[0] : null;
      if (sole && subscribed.has(sole.userId)) {
        await notifyUser({
          userId: sole.userId,
          kind: PUSH_KINDS.onlyOneEmpty,
          entityId: `${round.id}:${groupId}:${windowId}`,
          payload: onlyOneEmptyPayload({
            groupName: sole.groupName,
            remainingMs,
          }),
        });
      } else {
        for (const member of incomplete) {
          const used =
            filled.get(memberKey(member.userId, member.groupId))?.n ?? 0;
          const entityId = `${round.id}:${windowId}`;

          if (subscribed.has(member.userId)) {
            await notifyUser({
              userId: member.userId,
              kind: PUSH_KINDS.deadlineReminder,
              entityId,
              payload: deadlinePayload({
                missingSlots: slots - used,
                remainingMs,
                competitionLabel: label,
              }),
            });
            continue;
          }

          const recipient = email?.recipients.get(member.userId);
          if (!email || !recipient) continue;
          await notifyUserByEmail({
            userId: member.userId,
            kind: PUSH_KINDS.deadlineReminder,
            entityId,
            send: () =>
              sendEmail({
                to: recipient.email,
                unsubscribeUrl: unsubscribeUrl(recipient.userId, email.baseUrl),
                ...deadlineEmail({
                  missingSlots: slots - used,
                  remainingMs,
                  competitionLabel: label,
                  appUrl: email.baseUrl,
                  unsubscribeUrl: unsubscribeUrl(
                    recipient.userId,
                    email.baseUrl,
                  ),
                }),
              }),
          });
        }
      }

      for (const member of jokerFree) {
        if (!subscribed.has(member.userId)) continue;
        await notifyUser({
          userId: member.userId,
          kind: PUSH_KINDS.jokerUnused,
          entityId: `${round.id}:${member.groupId}:${windowId}`,
          payload: jokerUnusedPayload({
            remainingMs,
            competitionLabel: label,
          }),
        });
      }

      const emptyOthers = empty.filter((member) => !member.isAdmin);
      if (emptyOthers.length === 0) continue;
      const names = emptyOthers.map((member) => member.name);
      for (const admin of groupMembersList.filter((member) => member.isAdmin)) {
        if (!subscribed.has(admin.userId)) continue;
        await notifyUser({
          userId: admin.userId,
          kind: PUSH_KINDS.adminEmptyPicks,
          entityId: `${round.id}:${groupId}:${windowId}`,
          payload: adminEmptyPicksPayload({
            groupName: admin.groupName,
            remainingMs,
            names,
          }),
        });
      }
    }
  }
}

export type DeadlineMove = {
  roundId: string;
  competition: Competition;
  lockAt: Date;
};

export async function notifyDeadlineMoved(move: DeadlineMove) {
  if (!isPushConfigured()) return;

  const subscribed = await subscribedUserIds();
  if (subscribed.size === 0) return;

  const slots = await slotCountFor(move.roundId);
  if (!slots) return;
  const members = await membersForCompetition(move.competition);
  const filled = await entryStats(move.roundId);
  const payload = deadlineMovedPayload({
    competitionLabel: competitionLabel(move.competition),
    lockAt: move.lockAt,
  });

  for (const member of members) {
    if (!subscribed.has(member.userId)) continue;
    const used = filled.get(memberKey(member.userId, member.groupId))?.n ?? 0;
    if (used >= slots) continue;
    await notifyUser({
      userId: member.userId,
      kind: PUSH_KINDS.deadlineMoved,
      entityId: `${move.roundId}:${move.lockAt.toISOString()}`,
      payload,
    });
  }
}

export async function notifyMemberJoined(input: {
  groupId: string;
  groupName: string;
  joinerId: string;
  joinerName: string;
}) {
  if (!isPushConfigured()) return;

  const members = await db
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, input.groupId));

  const payload = memberJoinedPayload(input);
  for (const { userId } of members) {
    if (userId === input.joinerId) continue;
    await notifyUser({
      userId,
      kind: PUSH_KINDS.memberJoined,
      entityId: `${input.groupId}:${input.joinerId}`,
      payload,
    });
  }
}

function scorable(entry: {
  targetMatchId: string | null;
  targetSide: "home" | "away" | null;
  predictedHome: number | null;
  predictedAway: number | null;
  numericValue: number | null;
  isJoker: boolean;
}) {
  return {
    matchId: entry.targetMatchId,
    side: entry.targetSide,
    predictedHome: entry.predictedHome,
    predictedAway: entry.predictedAway,
    numericValue: entry.numericValue,
    isJoker: entry.isJoker,
  };
}

async function picksOnMatch(matchId: string) {
  return db.query.entries.findMany({
    where: eq(entries.targetMatchId, matchId),
    with: { roundChallenge: true, targetMatch: true },
  });
}

async function dispatchMatchEvents(
  since: Date,
  now: Date,
  subscribed: Set<string>,
) {
  const kickedOff = await db.query.matches.findMany({
    where: and(
      inArray(matches.status, ["live", "finished"]),
      gte(matches.kickoff, new Date(now.getTime() - PUSH_LOOKBACK_MS)),
      lte(matches.kickoff, now),
    ),
  });

  for (const match of kickedOff) {
    const picks = await picksOnMatch(match.id);
    for (const pick of picks) {
      if (!subscribed.has(pick.userId)) continue;
      await notifyUser({
        userId: pick.userId,
        kind: PUSH_KINDS.matchKickedOff,
        entityId: `${match.id}:${pick.userId}`,
        payload: matchKickedOffPayload({
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          challengeSlug: pick.roundChallenge.slug,
          matchId: match.id,
        }),
      });
    }
  }

  const live = await db.query.matches.findMany({
    where: eq(matches.status, "live"),
  });

  const roundSnapshot = new Map<
    string,
    Awaited<ReturnType<typeof toScoredSnapshot>>
  >();

  async function snapshotFor(match: (typeof live)[number]) {
    const key = `${match.competition}:${match.season}:${match.matchday}`;
    const cached = roundSnapshot.get(key);
    if (cached) return cached;
    const roundMatches = await db.query.matches.findMany({
      where: and(
        eq(matches.competition, match.competition),
        eq(matches.season, match.season),
        eq(matches.matchday, match.matchday),
      ),
    });
    const snapshot = toScoredSnapshot(roundMatches);
    roundSnapshot.set(key, snapshot);
    return snapshot;
  }

  for (const match of live) {
    const picks = await picksOnMatch(match.id);
    const hasHt = match.homeScoreHt !== null && match.awayScoreHt !== null;
    const hasGoals = (match.homeScore ?? 0) + (match.awayScore ?? 0) > 0;

    if (hasHt) {
      for (const pick of picks) {
        if (!subscribed.has(pick.userId)) continue;
        if (!HALF_TIME_SLUGS.has(pick.roundChallenge.slug)) continue;
        await notifyUser({
          userId: pick.userId,
          kind: PUSH_KINDS.halfTime,
          entityId: `${match.id}:${pick.userId}`,
          payload: halfTimePayload({
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            homeScoreHt: match.homeScoreHt as number,
            awayScoreHt: match.awayScoreHt as number,
            slug: pick.roundChallenge.slug,
            predictedHome: pick.predictedHome,
            predictedAway: pick.predictedAway,
            matchId: match.id,
          }),
        });
      }
    }

    if (hasGoals && match.homeScore !== null && match.awayScore !== null) {
      const snapshot = await snapshotFor(match);
      for (const pick of picks) {
        if (!subscribed.has(pick.userId)) continue;
        const slug = pick.roundChallenge.slug;
        if (!LIVE_SWING_SLUGS.has(slug)) continue;
        const points = scoreEntry(slug, scorable(pick), snapshot);
        const winning = points !== null && points > 0;
        if (points === null) continue;
        const teamOrMatch =
          pick.targetSide === "home"
            ? match.homeTeam
            : pick.targetSide === "away"
              ? match.awayTeam
              : `${match.homeTeam}–${match.awayTeam}`;
        await notifyUser({
          userId: pick.userId,
          kind: PUSH_KINDS.pickLiveSwing,
          entityId: pick.id,
          payload: pickLiveSwingPayload({
            slug,
            teamOrMatch,
            scoreline: `${match.homeScore}–${match.awayScore}`,
            winning,
            entryId: pick.id,
          }),
        });
      }
    }
  }

  const voided = await db.query.matches.findMany({
    where: and(
      inArray(matches.status, ["postponed", "cancelled"]),
      gte(matches.updatedAt, since),
    ),
  });

  for (const match of voided) {
    const picks = await picksOnMatch(match.id);
    for (const pick of picks) {
      if (!subscribed.has(pick.userId)) continue;
      await notifyUser({
        userId: pick.userId,
        kind: PUSH_KINDS.pickVoided,
        entityId: `${match.id}:${pick.userId}`,
        payload: pickVoidedPayload({
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          challengeSlug: pick.roundChallenge.slug,
          matchId: match.id,
        }),
      });
    }
  }

  const finished = await db.query.matches.findMany({
    where: and(eq(matches.status, "finished"), gte(matches.updatedAt, since)),
  });

  for (const match of finished) {
    if (match.homeScore === null || match.awayScore === null) continue;
    const picks = await picksOnMatch(match.id);
    const oneMatch = toScoredSnapshot([match]);

    for (const pick of picks) {
      if (!subscribed.has(pick.userId)) continue;
      const slug = pick.roundChallenge.slug;
      const points = scoreEntry(slug, scorable(pick), oneMatch);
      const exactHit =
        slug === "exact_score" && points !== null && points >= 100;
      const bankerMiss = slug === "banker" && points !== null && points < 0;

      if (exactHit) {
        await notifyUser({
          userId: pick.userId,
          kind: PUSH_KINDS.exactScoreHit,
          entityId: `${match.id}:${pick.userId}`,
          payload: exactScoreHitPayload({
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
            isJoker: pick.isJoker,
            matchId: match.id,
          }),
        });
        continue;
      }

      if (bankerMiss) {
        const team =
          pick.targetSide === "away" ? match.awayTeam : match.homeTeam;
        await notifyUser({
          userId: pick.userId,
          kind: PUSH_KINDS.bankerMissed,
          entityId: `${match.id}:${pick.userId}`,
          payload: bankerMissedPayload({
            team,
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
            points,
            matchId: match.id,
          }),
        });
        continue;
      }

      await notifyUser({
        userId: pick.userId,
        kind: PUSH_KINDS.matchFinished,
        entityId: match.id,
        payload: matchFinishedPayload({
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          matchId: match.id,
        }),
      });
    }
  }
}

async function dispatchRoundSettled(
  since: Date,
  subscribed: Set<string>,
  email: EmailFallback | null,
) {
  const settled = await db.query.rounds.findMany({
    where: and(
      eq(rounds.status, "settled"),
      isNotNull(rounds.settledAt),
      gte(rounds.settledAt, since),
    ),
  });

  for (const round of settled) {
    const scored = await db
      .select({
        userId: entries.userId,
        groupId: entries.groupId,
        groupName: groups.name,
        points: sql<number>`coalesce(sum(${entries.pointsAwarded}), 0)`,
      })
      .from(entries)
      .innerJoin(groups, eq(groups.id, entries.groupId))
      .where(and(eq(entries.roundId, round.id), liveGroup))
      .groupBy(entries.userId, entries.groupId, groups.name);

    for (const row of scored) {
      const entityId = `${round.id}:${row.groupId}`;

      if (subscribed.has(row.userId)) {
        await notifyUser({
          userId: row.userId,
          kind: PUSH_KINDS.roundSettled,
          entityId,
          payload: roundSettledPayload({
            matchday: round.matchday,
            groupName: row.groupName,
            points: Number(row.points),
            groupId: row.groupId,
          }),
        });
        continue;
      }

      const recipient = email?.recipients.get(row.userId);
      if (!email || !recipient) continue;
      await notifyUserByEmail({
        userId: row.userId,
        kind: PUSH_KINDS.roundSettled,
        entityId,
        send: () =>
          sendEmail({
            to: recipient.email,
            unsubscribeUrl: unsubscribeUrl(recipient.userId, email.baseUrl),
            ...roundSettledEmail({
              matchday: round.matchday,
              groupName: row.groupName,
              points: Number(row.points),
              appUrl: `${email.baseUrl}/group`,
              unsubscribeUrl: unsubscribeUrl(recipient.userId, email.baseUrl),
            }),
          }),
      });
    }

    const members = await membersForCompetition(round.competition);
    const byGroup = new Map<string, MemberRow[]>();
    for (const member of members) {
      const list = byGroup.get(member.groupId);
      if (list) list.push(member);
      else byGroup.set(member.groupId, [member]);
    }

    const deltaByMember = new Map<string, number>();
    for (const row of scored) {
      deltaByMember.set(memberKey(row.userId, row.groupId), Number(row.points));
    }

    const remaining =
      COMPETITIONS[round.competition as Competition].matchdayCount -
      round.matchday;

    // Streaks are a within-season run: the summer break ends one.
    const settledRounds = await db.query.rounds.findMany({
      where: and(
        eq(rounds.competition, round.competition),
        eq(rounds.season, round.season),
        eq(rounds.status, "settled"),
      ),
      orderBy: [desc(rounds.season), desc(rounds.matchday)],
    });

    for (const [groupId, groupMembersList] of byGroup) {
      const after: RankedMember[] = groupMembersList.map((member) => ({
        userId: member.userId,
        name: member.name,
        points: member.points,
      }));
      const before: RankedMember[] = groupMembersList.map((member) => {
        const delta = deltaByMember.get(
          memberKey(member.userId, member.groupId),
        );
        return {
          userId: member.userId,
          name: member.name,
          points: member.points - (delta ?? 0),
        };
      });

      const groupName = groupMembersList[0]?.groupName ?? "";
      for (const shift of rankShifts(before, after)) {
        if (!subscribed.has(shift.userId)) continue;
        if (shift.isFirst || shift.isLast) {
          await notifyUser({
            userId: shift.userId,
            kind: PUSH_KINDS.tableExtreme,
            entityId: `${round.id}:${groupId}:${shift.isFirst ? "first" : "last"}`,
            payload: tableExtremePayload({
              groupName,
              groupId,
              matchday: round.matchday,
              points: shift.points,
              place: shift.isFirst ? "first" : "last",
            }),
          });
          continue;
        }
        await notifyUser({
          userId: shift.userId,
          kind: PUSH_KINDS.rankChange,
          entityId: `${round.id}:${groupId}`,
          payload: rankChangePayload({
            groupName,
            groupId,
            matchday: round.matchday,
            newRank: shift.newRank,
            overtookName: shift.overtookName,
            overtakenByName: shift.overtakenByName,
          }),
        });
      }

      const memberIds = groupMembersList.map((member) => member.userId);
      const hitsByRound =
        memberIds.length === 0
          ? []
          : await db
              .select({
                userId: entries.userId,
                roundId: entries.roundId,
                hits: count(
                  sql`case when ${entries.pointsAwarded} > 0 then 1 end`,
                ),
              })
              .from(entries)
              .where(
                and(
                  eq(entries.groupId, groupId),
                  inArray(entries.userId, memberIds),
                  isNotNull(entries.pointsAwarded),
                ),
              )
              .groupBy(entries.userId, entries.roundId);

      const hitMap = new Map<string, number>();
      for (const row of hitsByRound) {
        hitMap.set(`${row.userId}:${row.roundId}`, Number(row.hits));
      }

      for (const member of groupMembersList) {
        if (!subscribed.has(member.userId)) continue;
        const series = settledRounds.map((item) => ({
          hits: hitMap.get(`${member.userId}:${item.id}`) ?? 0,
        }));
        const streak = roundHitStreak(series);
        const thisHits = hitMap.get(`${member.userId}:${round.id}`) ?? 0;
        const previousStreak = roundHitStreak(series.slice(1));

        if (
          streakBroke({
            hitsThisRound: thisHits,
            previousStreak,
            minStreak: 3,
          })
        ) {
          await notifyUser({
            userId: member.userId,
            kind: PUSH_KINDS.streak,
            entityId: `${round.id}:${member.groupId}:broke`,
            payload: streakPayload({
              groupName,
              groupId,
              roundId: round.id,
              streak: previousStreak,
              broke: true,
            }),
          });
        } else if ((STREAK_MILESTONES as readonly number[]).includes(streak)) {
          await notifyUser({
            userId: member.userId,
            kind: PUSH_KINDS.streak,
            entityId: `${round.id}:${member.groupId}:${streak}`,
            payload: streakPayload({
              groupName,
              groupId,
              roundId: round.id,
              streak,
              broke: false,
            }),
          });
        }
      }

      if (!TITLE_RACE_REMAINING.has(remaining)) continue;
      const race = titleRaceSnapshot(after);
      if (!race) continue;
      for (const member of groupMembersList) {
        if (!subscribed.has(member.userId)) continue;
        await notifyUser({
          userId: member.userId,
          kind: PUSH_KINDS.titleRace,
          entityId: `${groupId}:remaining-${remaining}`,
          payload: titleRacePayload({
            groupName,
            groupId,
            remaining,
            leaderName: race.leader.name,
            leaderPoints: race.leader.points,
            secondName: race.second.name,
            gap: race.gap,
          }),
        });
      }
    }
  }
}

/** Fan out due game events. Safe to call on every cron tick. */
export async function dispatchPushNotifications(now = new Date()) {
  const pushOn = isPushConfigured();
  const emailOn = isEmailConfigured();
  if (!pushOn && !emailOn) return;

  const subscribed = pushOn ? await subscribedUserIds() : new Set<string>();
  // Email only goes to people push cannot reach, so the opted-in set is
  // filtered against the subscribers we just read.
  const email: EmailFallback | null = emailOn
    ? { recipients: await emailOptedInUsers(), baseUrl: appBaseUrl() }
    : null;

  if (subscribed.size === 0 && !email) return;

  const since = new Date(now.getTime() - PUSH_LOOKBACK_MS);

  await dispatchBoardReminders(now, subscribed, email);
  if (subscribed.size > 0) {
    await dispatchMatchEvents(since, now, subscribed);
  }
  await dispatchRoundSettled(since, subscribed, email);
}
