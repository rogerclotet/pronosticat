export const PUSH_KINDS = {
  deadlineReminder: "deadline_reminder",
  matchFinished: "match_finished",
  roundSettled: "round_settled",
  roundOpen: "round_open",
  jokerUnused: "joker_unused",
  onlyOneEmpty: "only_one_empty",
  deadlineMoved: "deadline_moved",
  matchKickedOff: "match_kicked_off",
  halfTime: "half_time",
  pickLiveSwing: "pick_live_swing",
  pickVoided: "pick_voided",
  exactScoreHit: "exact_score_hit",
  bankerMissed: "banker_missed",
  rankChange: "rank_change",
  tableExtreme: "table_extreme",
  streak: "streak",
  memberJoined: "member_joined",
  adminEmptyPicks: "admin_empty_picks",
  titleRace: "title_race",
} as const;

export type PushKind = (typeof PUSH_KINDS)[keyof typeof PUSH_KINDS];

export type PushUrgency = "high" | "normal";

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
  urgency?: PushUrgency;
};

export type PushSubscriptionKeys = {
  p256dh: string;
  auth: string;
};

export type SerializedPushSubscription = {
  endpoint: string;
  keys: PushSubscriptionKeys;
};
