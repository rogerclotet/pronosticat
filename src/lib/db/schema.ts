import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const competitionEnum = pgEnum("competition", [
  "laliga",
  "premier_league",
  "champions_league",
]);

export const matchStatusEnum = pgEnum("match_status", [
  "scheduled",
  "live",
  "finished",
  "postponed",
  "cancelled",
]);

/** A round is open for picks, locked at first kickoff, then settled once played. */
export const roundStatusEnum = pgEnum("round_status", [
  "open",
  "locked",
  "settled",
]);

/** Team targets are addressed as (match, side): a team plays exactly once per round. */
export const targetSideEnum = pgEnum("target_side", ["home", "away"]);

// Better Auth tables
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("account_user_idx").on(table.userId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// App tables
export const groups = pgTable("groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  competition: competitionEnum("competition").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  startingPoints: integer("starting_points").notNull().default(0),
  createdById: text("created_by_id")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const groupMembers = pgTable(
  "group_members",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    points: integer("points").notNull(),
    isAdmin: boolean("is_admin").notNull().default(false),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("group_members_group_user_idx").on(table.groupId, table.userId),
    index("group_members_user_idx").on(table.userId),
  ],
);

export const matches = pgTable(
  "matches",
  {
    id: text("id").primaryKey(),
    externalId: integer("external_id").notNull(),
    competition: competitionEnum("competition").notNull(),
    homeTeam: text("home_team").notNull(),
    awayTeam: text("away_team").notNull(),
    homeTeamCrest: text("home_team_crest"),
    awayTeamCrest: text("away_team_crest"),
    homeScore: integer("home_score"),
    awayScore: integer("away_score"),
    homeScoreHt: integer("home_score_ht"),
    awayScoreHt: integer("away_score_ht"),
    matchday: integer("matchday").notNull(),
    status: matchStatusEnum("status").notNull().default("scheduled"),
    kickoff: timestamp("kickoff").notNull(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("matches_external_competition_idx").on(
      table.externalId,
      table.competition,
    ),
    index("matches_competition_matchday_idx").on(
      table.competition,
      table.matchday,
    ),
    index("matches_competition_status_idx").on(table.competition, table.status),
  ],
);

export const rounds = pgTable(
  "rounds",
  {
    id: text("id").primaryKey(),
    competition: competitionEnum("competition").notNull(),
    matchday: integer("matchday").notNull(),
    status: roundStatusEnum("status").notNull().default("open"),
    /** First kickoff of the round: the single deadline for every pick. */
    lockAt: timestamp("lock_at").notNull(),
    settledAt: timestamp("settled_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("rounds_competition_matchday_idx").on(
      table.competition,
      table.matchday,
    ),
    index("rounds_competition_status_idx").on(table.competition, table.status),
  ],
);

/** One slot of the round's board. Global, so every group plays the same challenges. */
export const roundChallenges = pgTable(
  "round_challenges",
  {
    id: text("id").primaryKey(),
    roundId: text("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    position: integer("position").notNull(),
  },
  (table) => [
    uniqueIndex("round_challenges_round_slug_idx").on(table.roundId, table.slug),
  ],
);

export const entries = pgTable(
  "entries",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    roundChallengeId: text("round_challenge_id")
      .notNull()
      .references(() => roundChallenges.id, { onDelete: "cascade" }),
    /** Denormalized from roundChallenges so the one-joker-per-round index can exist. */
    roundId: text("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    targetMatchId: text("target_match_id").references(() => matches.id, {
      onDelete: "cascade",
    }),
    targetSide: targetSideEnum("target_side"),
    predictedHome: integer("predicted_home"),
    predictedAway: integer("predicted_away"),
    numericValue: integer("numeric_value"),
    /** Reserved for multi-target challenges (e.g. picking three winners). */
    targetsJson: jsonb("targets_json"),
    isJoker: boolean("is_joker").notNull().default(false),
    lockedAt: timestamp("locked_at"),
    pointsAwarded: integer("points_awarded"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("entries_user_group_challenge_idx").on(
      table.userId,
      table.groupId,
      table.roundChallengeId,
    ),
    uniqueIndex("entries_one_joker_per_round_idx")
      .on(table.userId, table.groupId, table.roundId)
      .where(sql`${table.isJoker}`),
    index("entries_round_idx").on(table.roundId),
    index("entries_user_group_round_idx").on(
      table.userId,
      table.groupId,
      table.roundId,
    ),
  ],
);

export const userActiveGroup = pgTable("user_active_group", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  groupId: text("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
});

// Relations
export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  groupMembers: many(groupMembers),
  entries: many(entries),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  createdBy: one(user, {
    fields: [groups.createdById],
    references: [user.id],
  }),
  members: many(groupMembers),
  entries: many(entries),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id],
  }),
  user: one(user, { fields: [groupMembers.userId], references: [user.id] }),
}));

export const matchesRelations = relations(matches, ({ many }) => ({
  entries: many(entries),
}));

export const roundsRelations = relations(rounds, ({ many }) => ({
  challenges: many(roundChallenges),
  entries: many(entries),
}));

export const roundChallengesRelations = relations(
  roundChallenges,
  ({ one, many }) => ({
    round: one(rounds, {
      fields: [roundChallenges.roundId],
      references: [rounds.id],
    }),
    entries: many(entries),
  }),
);

export const entriesRelations = relations(entries, ({ one }) => ({
  user: one(user, { fields: [entries.userId], references: [user.id] }),
  group: one(groups, { fields: [entries.groupId], references: [groups.id] }),
  roundChallenge: one(roundChallenges, {
    fields: [entries.roundChallengeId],
    references: [roundChallenges.id],
  }),
  round: one(rounds, { fields: [entries.roundId], references: [rounds.id] }),
  targetMatch: one(matches, {
    fields: [entries.targetMatchId],
    references: [matches.id],
  }),
}));
