import {
  ArrowLeftRight,
  Ban,
  Calculator,
  Crosshair,
  Equal,
  Factory,
  Flame,
  House,
  Lock,
  Moon,
  Shield,
  Sparkles,
  Swords,
  Target,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

/** A glyph per challenge, so an empty slot still reads at a glance. */
const iconBySlug: Record<string, LucideIcon> = {
  exact_score: Crosshair,
  goal_fest: Flame,
  thrashing: Swords,
  goal_machine: Factory,
  banker: Lock,
  the_bore: Moon,
  upset: Sparkles,
  clean_sheet: Shield,
  blank: Ban,
  choke: TrendingDown,
  draw_pick: Equal,
  btts: ArrowLeftRight,
  comeback: TrendingUp,
  total_goals: Calculator,
  home_wins: House,
};

export const fallbackChallengeIcon: LucideIcon = Target;

export { iconBySlug as challengeIcons };
