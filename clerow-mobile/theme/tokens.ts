import { Platform } from 'react-native';

/**
 * Clerow mobile design tokens — ported from the `ios-app.css` `:root` block.
 * Black / white / dark-blue · Nunito · gamified.
 */
export const colors = {
  ink: '#131313',
  ink2: '#5E5E5E',
  ink3: '#9A9A9A',
  ink4: '#C9C9C9',
  line: '#ECEBE7',
  line2: '#F4F3EF',
  paper: '#FFFFFF',
  paper2: '#F7F7F5',

  navy: '#1E4F6B',
  navy2: '#143A52',
  navyDeep: '#0A2435',
  navySoft: '#E7F0F4',
  navyMid: '#C2DBE2',

  xp: '#FFC800',
  xpDeep: '#C99A00',
  streak: '#FF7B1F',
  streakDeep: '#D5631A',
  success: '#34A853',
  danger: '#E04848',
} as const;

/**
 * Nunito weights mirror the CSS `font-weight` usage (500–900).
 * These keys match the export names from `@expo-google-fonts/nunito`.
 */
export const font = {
  medium: 'Nunito_500Medium',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extrabold: 'Nunito_800ExtraBold',
  black: 'Nunito_900Black',
} as const;

/** The design uses Geist Mono for numbers; system monospace is the no-asset stand-in. */
export const mono = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
}) as string;

export const radius = {
  sm: 9,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;
