import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode, useState } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { colors, font, mono, radius } from '../theme/tokens';

/* ============================ Card ============================ */
export function Card({
  children,
  style,
  pad0 = false,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  pad0?: boolean;
}) {
  return <View style={[s.card, pad0 && s.cardPad0, style]}>{children}</View>;
}

export function CardHeader({ title, more }: { title: string; more?: string }) {
  return (
    <View style={s.cardH}>
      <Text style={s.cardHTitle}>{title}</Text>
      {more ? <Text style={s.cardHMore}>{more}</Text> : null}
    </View>
  );
}

/* ====================== Chunky button ======================= */
type BtnVariant = 'navy' | 'ghost' | 'white' | 'dark';
type BtnSize = 'md' | 'lg' | 'sm';

const BTN_FACE: Record<BtnVariant, { face: string; shadow: string; text: string; border?: string }> = {
  navy: { face: colors.navy, shadow: colors.navyDeep, text: '#fff' },
  ghost: { face: colors.paper, shadow: colors.line, text: colors.ink, border: colors.line },
  white: { face: '#fff', shadow: 'rgba(0,0,0,0.18)', text: colors.navy2 },
  dark: { face: colors.ink, shadow: '#000', text: '#fff' },
};
const BTN_DIM: Record<BtnSize, { h: number; r: number; fs: number }> = {
  md: { h: 54, r: 16, fs: 16 },
  lg: { h: 58, r: 18, fs: 17 },
  sm: { h: 42, r: 12, fs: 14 },
};

export function Button({
  title,
  onPress,
  variant = 'navy',
  size = 'md',
  icon,
  full = true,
  style,
  textStyle,
}: {
  title: string;
  onPress?: () => void;
  variant?: BtnVariant;
  size?: BtnSize;
  icon?: ReactNode;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const [down, setDown] = useState(false);
  const v = BTN_FACE[variant];
  const d = BTN_DIM[size];
  const lift = 4;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      style={[{ height: d.h + lift, alignSelf: full ? 'stretch' : 'flex-start' }, style]}
    >
      {/* shadow lip */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: d.h,
          borderRadius: d.r,
          backgroundColor: v.shadow,
        }}
      />
      {/* face */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: d.h,
          borderRadius: d.r,
          backgroundColor: v.face,
          borderWidth: v.border ? 2 : 0,
          borderColor: v.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingHorizontal: 24,
          transform: [{ translateY: down ? lift : 0 }],
        }}
      >
        <Text style={[{ color: v.text, fontFamily: font.extrabold, fontSize: d.fs }, textStyle]}>{title}</Text>
        {icon}
      </View>
    </Pressable>
  );
}

export function OAuthButton({ title, icon, onPress }: { title: string; icon?: ReactNode; onPress?: () => void }) {
  const [down, setDown] = useState(false);
  return (
    <Pressable onPress={onPress} onPressIn={() => setDown(true)} onPressOut={() => setDown(false)} style={{ height: 58 }}>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 54, borderRadius: 16, backgroundColor: colors.line }} />
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: 54,
          borderRadius: 16,
          backgroundColor: colors.paper,
          borderWidth: 2,
          borderColor: colors.line,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          transform: [{ translateY: down ? 4 : 0 }],
        }}
      >
        {icon}
        <Text style={{ color: colors.ink, fontFamily: font.extrabold, fontSize: 16 }}>{title}</Text>
      </View>
    </Pressable>
  );
}

/* ====================== Pills / tags ======================== */
export function Pill({ children, style, textStyle }: { children: ReactNode; style?: StyleProp<ViewStyle>; textStyle?: StyleProp<TextStyle> }) {
  return (
    <View style={[s.pill, style]}>
      {typeof children === 'string' ? <Text style={[s.pillText, textStyle]}>{children}</Text> : children}
    </View>
  );
}

export function Tag({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View style={[s.tag, { backgroundColor: bg }]}>
      <Text style={[s.tagText, { color }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

/* ===================== Section heading ====================== */
export function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={s.secH}>
      <Text style={s.secHTitle}>{title}</Text>
      {hint ? <Text style={s.secHHint}>{hint}</Text> : null}
    </View>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <Text style={s.eyebrow}>{children}</Text>;
}

/* ========================= Callout ========================== */
export function Callout({ emoji, children }: { emoji: string; children: ReactNode }) {
  return (
    <View style={s.callout}>
      <Text style={{ fontSize: 16 }}>{emoji}</Text>
      <Text style={s.calloutText}>{children}</Text>
    </View>
  );
}

/* ===================== Delta indicator ====================== */
export function Delta({ value, up }: { value: string; up: boolean }) {
  return <Text style={[s.delta, { color: up ? colors.success : colors.danger }]}>{value}</Text>;
}

/* ===================== Segmented control =================== */
export function Segmented({ options, value, onChange }: { options: string[]; value: number; onChange?: (i: number) => void }) {
  return (
    <View style={s.seg}>
      {options.map((o, i) => (
        <Pressable key={o} style={[s.segBtn, i === value && s.segBtnOn]} onPress={() => onChange?.(i)}>
          <Text style={[s.segText, i === value && s.segTextOn]}>{o}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/* ====================== Score ring (SVG) ==================== */
export function ScoreRing({ value, size = 116, label = 'score' }: { value: number; size?: number; label?: string }) {
  const stroke = 11;
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id="iaGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={colors.navy} />
            <Stop offset="100%" stopColor={colors.navy2} />
          </SvgGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.line} strokeWidth={stroke} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#iaGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: font.black, fontSize: size * 0.29, color: colors.ink, letterSpacing: -1 }}>{value}</Text>
          <Text style={{ fontFamily: font.extrabold, fontSize: 9.5, color: colors.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>
            {label}
          </Text>
        </View>
      </View>
    </View>
  );
}

/* ===================== Score-stat bar ====================== */
export function Sstat({ label, value, pct, color }: { label: string; value: string; pct: number; color: string }) {
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Text style={{ fontFamily: font.bold, fontSize: 12.5, color: colors.ink2 }}>{label}</Text>
        <Text style={{ fontFamily: mono, fontWeight: '800', fontSize: 13, color: colors.ink }}>{value}</Text>
      </View>
      <View style={s.sbar}>
        <View style={{ height: '100%', borderRadius: radius.pill, width: `${pct}%`, backgroundColor: color }} />
      </View>
    </View>
  );
}

/* ====================== Mini bar chart ===================== */
export function MiniChart({ data }: { data: number[] }) {
  const last = data.length - 1;
  return (
    <View style={s.miniChart}>
      {data.map((h, i) => (
        <View key={i} style={{ flex: 1, height: `${h}%`, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: i === last ? colors.navy : colors.navyMid }} />
      ))}
    </View>
  );
}

/* ===================== Streak banner ======================= */
export function StreakBanner({ days, onDays }: { days: string[]; onDays: number }) {
  return (
    <LinearGradient colors={['#FFF1E0', '#FFE0C0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.streak}>
      <View style={s.streakFlame}>
        <Text style={{ fontSize: 26 }}>🔥</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: font.black, fontSize: 20, color: colors.streakDeep, letterSpacing: -0.2 }}>{onDays}-day streak</Text>
        <Text style={{ fontFamily: font.bold, fontSize: 12.5, color: '#8A5A2A' }}>Scan daily to keep it alive</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 5 }}>
        {days.map((d, i) => (
          <View key={i} style={[s.streakDay, i < 5 && s.streakDayOn]}>
            <Text style={{ fontFamily: font.extrabold, fontSize: 11, color: i < 5 ? '#fff' : '#C98A50' }}>{d}</Text>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

/* ======================= Level bar ========================= */
export function LevelBar({ level, pct, xp, weekly, next }: { level: string; pct: number; xp: string; weekly: string; next: string }) {
  return (
    <View style={s.level}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontFamily: font.black, fontSize: 17, color: '#fff' }}>{level}</Text>
        <Text style={{ fontFamily: mono, fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{xp}</Text>
      </View>
      <View style={s.levelBar}>
        <LinearGradient colors={['#FFE266', colors.xp]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ height: '100%', borderRadius: radius.pill, width: `${pct}%` }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <Text style={{ fontFamily: font.bold, fontSize: 11.5, color: 'rgba(255,255,255,0.85)' }}>{weekly}</Text>
        <Text style={{ fontFamily: font.bold, fontSize: 11.5, color: 'rgba(255,255,255,0.85)' }}>{next}</Text>
      </View>
    </View>
  );
}

/* ========================= Divider ========================= */
export function Divider({ label }: { label: string }) {
  return (
    <View style={s.divider}>
      <View style={s.dividerLine} />
      <Text style={s.dividerText}>{label}</Text>
      <View style={s.dividerLine} />
    </View>
  );
}

/* ===================== Small swatch ======================== */
export function Swatch({ char, color, size = 30 }: { char: string; color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontFamily: font.black, fontSize: size * 0.4 }}>{char}</Text>
    </View>
  );
}

export const s = StyleSheet.create({
  card: { backgroundColor: colors.paper, borderWidth: 1.5, borderColor: colors.line, borderRadius: 22, padding: 18, marginBottom: 12 },
  cardPad0: { padding: 0, overflow: 'hidden' },
  cardH: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  cardHTitle: { fontFamily: font.black, fontSize: 16, color: colors.ink, letterSpacing: -0.16 },
  cardHMore: { fontFamily: font.extrabold, fontSize: 13, color: colors.navy },

  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.navySoft, alignSelf: 'flex-start' },
  pillText: { color: colors.navy2, fontSize: 12, fontFamily: font.extrabold },

  tag: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 7, alignSelf: 'flex-start' },
  tagText: { fontSize: 10.5, fontFamily: font.extrabold, letterSpacing: 0.3 },

  secH: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 18, marginBottom: 12, marginHorizontal: 2 },
  secHTitle: { fontFamily: font.black, fontSize: 18, color: colors.ink, letterSpacing: -0.27 },
  secHHint: { fontFamily: font.bold, fontSize: 12, color: colors.ink2 },

  eyebrow: { fontFamily: font.extrabold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.9, color: colors.navy },

  callout: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: colors.navySoft, borderRadius: 14, padding: 13, marginBottom: 12 },
  calloutText: { flex: 1, fontSize: 12.5, fontFamily: font.semibold, color: colors.navy2, lineHeight: 17 },

  delta: { fontFamily: mono, fontWeight: '800', fontSize: 12 },

  seg: { flexDirection: 'row', backgroundColor: colors.paper2, borderWidth: 1.5, borderColor: colors.line, borderRadius: 14, padding: 4, marginBottom: 14 },
  segBtn: { flex: 1, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  segBtnOn: { backgroundColor: colors.paper, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segText: { fontFamily: font.extrabold, fontSize: 13, color: colors.ink2 },
  segTextOn: { color: colors.ink },

  sbar: { height: 7, borderRadius: radius.pill, backgroundColor: colors.line, overflow: 'hidden' },

  miniChart: { height: 70, flexDirection: 'row', alignItems: 'flex-end', gap: 5, marginTop: 6 },

  streak: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1.5, borderColor: '#FFD0A0', borderRadius: 20, padding: 14, marginBottom: 12 },
  streakFlame: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.streak, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: colors.streakDeep },
  streakDay: { width: 22, height: 26, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },
  streakDayOn: { backgroundColor: colors.streak },

  level: { backgroundColor: colors.navy, borderRadius: 20, padding: 18, paddingVertical: 16, marginBottom: 12 },
  levelBar: { height: 12, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.line },
  dividerText: { color: colors.ink3, fontSize: 12, fontFamily: font.extrabold, textTransform: 'uppercase', letterSpacing: 0.7 },
});
