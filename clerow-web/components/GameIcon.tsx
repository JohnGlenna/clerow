import type { IconType } from "react-icons";
import {
  GiFlame,
  GiTrophy,
  GiLaurelsTrophy,
  GiPodiumWinner,
  GiTwoCoins,
  GiCutDiamond,
  GiPadlock,
  GiUpgrade,
  GiLightningArc,
  GiTargetArrows,
  GiBullseye,
  GiWorld,
  GiBrain,
  GiScrollUnfurled,
  GiCrossedSwords,
  GiSparkles,
  GiStarFormation,
  GiCrown,
  GiOwl,
  GiRocket,
  GiGreekTemple,
  GiCheckMark,
  GiMagnifyingGlass,
  GiChart,
  GiProgression,
  GiGears,
  GiQuillInk,
  GiCompass,
  GiBrickWall,
  GiBoxingGlove,
  GiOfficeChair,
  GiMountaintop,
  GiLevelEndFlag,
  GiPartyPopper,
  GiAchievement,
  GiChatBubble,
  GiMegaphone,
  GiCycle,
  GiCalendar,
  GiGamepad,
  GiLightBulb,
  GiOpenFolder,
  GiBookCover,
} from "react-icons/gi";

/**
 * Game-art icons for Clerow's gamification surfaces (streaks, XP, quests,
 * achievements, levels). These come from game-icons.net via `react-icons/gi`
 * and are licensed CC BY 3.0 — attribution lives in the site footer and
 * in clerow-web/CREDITS.md. Plain UI chrome should keep using ../Icon.tsx
 * (the Feather-style line set); reach for GameIcon only where the playful,
 * "this is a game" feel is the point.
 */
const ICONS = {
  // streak / habit
  flame: GiFlame,
  // rewards & ranking
  trophy: GiTrophy,
  laurels: GiLaurelsTrophy,
  podium: GiPodiumWinner,
  crown: GiCrown,
  achievement: GiAchievement,
  // currency / progress
  xp: GiTwoCoins,
  gem: GiCutDiamond,
  level: GiUpgrade,
  bolt: GiLightningArc,
  star: GiStarFormation,
  // state
  locked: GiPadlock,
  check: GiCheckMark,
  // quests / actions
  target: GiTargetArrows,
  bullseye: GiBullseye,
  scroll: GiScrollUnfurled,
  swords: GiCrossedSwords,
  compass: GiCompass,
  mountain: GiMountaintop,
  flag: GiLevelEndFlag,
  party: GiPartyPopper,
  // scan / data
  search: GiMagnifyingGlass,
  chart: GiChart,
  progression: GiProgression,
  world: GiWorld,
  brain: GiBrain,
  gears: GiGears,
  quill: GiQuillInk,
  bricks: GiBrickWall,
  calendar: GiCalendar,
  // task types
  chat: GiChatBubble,
  megaphone: GiMegaphone,
  cycle: GiCycle,
  gamepad: GiGamepad,
  idea: GiLightBulb,
  folder: GiOpenFolder,
  book: GiBookCover,
  // brand / pricing tiers
  owl: GiOwl,
  rocket: GiRocket,
  temple: GiGreekTemple,
  office: GiOfficeChair,
  boxing: GiBoxingGlove,
  sparkles: GiSparkles,
} satisfies Record<string, IconType>;

export type GameIconName = keyof typeof ICONS;

export function GameIcon({
  name,
  size = 20,
  color = "currentColor",
  className,
}: {
  name: GameIconName;
  size?: number;
  color?: string;
  className?: string;
}) {
  const Glyph = ICONS[name];
  return (
    <Glyph
      size={size}
      color={color}
      className={className ? `game-icon ${className}` : "game-icon"}
      aria-hidden
    />
  );
}
