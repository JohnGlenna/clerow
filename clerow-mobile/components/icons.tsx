import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';
import { colors } from '../theme/tokens';

export type IconName =
  | 'home'
  | 'prompts'
  | 'quests'
  | 'rank'
  | 'you'
  | 'bell'
  | 'back'
  | 'settings'
  | 'check'
  | 'arrow'
  | 'search'
  | 'share'
  | 'lock'
  | 'chevron';

type Props = { name: IconName; size?: number; color?: string; strokeWidth?: number };

/** Line-style icon set, ported from `components/ios-tabbar.jsx` (TabIcon). */
export function Icon({ name, size = 24, color = colors.ink, strokeWidth = 2 }: Props) {
  const p = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (name) {
    case 'home':
      return (
        <Svg {...p}>
          <Path d="M3 11l9-7 9 7" />
          <Path d="M5 10v10h14V10" />
        </Svg>
      );
    case 'prompts':
      return (
        <Svg {...p}>
          <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </Svg>
      );
    case 'quests':
      return (
        <Svg {...p}>
          <Path d="M8 4h8v4a4 4 0 0 1-8 0V4z" />
          <Path d="M16 5h3v2a3 3 0 0 1-3 3" />
          <Path d="M8 5H5v2a3 3 0 0 0 3 3" />
          <Path d="M10 14h4v5h-4z" />
          <Path d="M7 21h10" />
        </Svg>
      );
    case 'rank':
      return (
        <Svg {...p}>
          <Line x1="6" y1="20" x2="6" y2="14" />
          <Line x1="12" y1="20" x2="12" y2="4" />
          <Line x1="18" y1="20" x2="18" y2="10" />
        </Svg>
      );
    case 'you':
      return (
        <Svg {...p}>
          <Circle cx="12" cy="8" r="4" />
          <Path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
        </Svg>
      );
    case 'bell':
      return (
        <Svg {...p}>
          <Path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <Path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </Svg>
      );
    case 'back':
      return (
        <Svg {...p}>
          <Path d="M15 18l-6-6 6-6" />
        </Svg>
      );
    case 'settings':
      return (
        <Svg {...p}>
          <Circle cx="12" cy="12" r="3" />
          <Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-2.9-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.1-2.9H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.1-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.1V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 2.9 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.1 2.9H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.4.9z" />
        </Svg>
      );
    case 'check':
      return (
        <Svg {...p}>
          <Polyline points="20 6 9 17 4 12" />
        </Svg>
      );
    case 'arrow':
      return (
        <Svg {...p}>
          <Line x1="5" y1="12" x2="19" y2="12" />
          <Polyline points="12 5 19 12 12 19" />
        </Svg>
      );
    case 'search':
      return (
        <Svg {...p}>
          <Circle cx="11" cy="11" r="7" />
          <Line x1="21" y1="21" x2="16.5" y2="16.5" />
        </Svg>
      );
    case 'share':
      return (
        <Svg {...p}>
          <Path d="M4 12v8h16v-8" />
          <Polyline points="8 6 12 2 16 6" />
          <Line x1="12" y1="2" x2="12" y2="15" />
        </Svg>
      );
    case 'lock':
      return (
        <Svg {...p}>
          <Rect x="5" y="11" width="14" height="10" rx="2" />
          <Path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </Svg>
      );
    case 'chevron':
      return (
        <Svg {...p}>
          <Polyline points="9 6 15 12 9 18" />
        </Svg>
      );
    default:
      return null;
  }
}

/** Multicolor Google "G", ported from `ios-onboarding.jsx`. */
export function GoogleG({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#FBBC05"
        d="M24 9.5c3.3 0 6.3 1.1 8.6 3.3l6.4-6.4C35.5 2.8 30.1.5 24 .5 14.7.5 6.7 5.8 2.9 13.7l7.5 5.8C12.2 13.6 17.6 9.5 24 9.5z"
      />
      <Path
        fill="#34A853"
        d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.6c-.6 3-2.3 5.5-4.9 7.2l7.5 5.8c4.4-4 6.8-9.9 6.8-17.5z"
      />
      <Path
        fill="#4285F4"
        d="M10.4 28.5c-.6-1.7-.9-3.5-.9-5.5s.3-3.8.9-5.5l-7.5-5.8C1.1 15.5 0 19.6 0 24s1.1 8.5 2.9 12.3l7.5-5.8z"
      />
      <Path
        fill="#EA4335"
        d="M24 47.5c6.1 0 11.5-2 15.3-5.5l-7.5-5.8c-2.1 1.4-4.7 2.3-7.8 2.3-6.4 0-11.8-4.1-13.6-9.8l-7.5 5.8C6.7 42.2 14.7 47.5 24 47.5z"
      />
    </Svg>
  );
}
