import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Rect, Text as SvgText } from 'react-native-svg';
import { Mascot } from '../components/Mascot';
import { Button, ScoreRing } from '../components/ui';
import { colors, font } from '../theme/tokens';

type Slide = {
  lines: { text: string; accent?: boolean }[][];
  body: string;
  cta: string;
  art: React.ReactNode;
};

function ArtAsk() {
  return (
    <View style={{ width: 240, height: 240, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[styles.bubble, { top: 8, left: 0, borderBottomLeftRadius: 4 }]}>
        <Text style={styles.bubbleText}>"best AI music generator?"</Text>
      </View>
      <Mascot size={150} float />
      <View style={[styles.bubble, styles.bubbleDark, { bottom: 6, right: 0, borderBottomRightRadius: 4 }]}>
        <Text style={[styles.bubbleText, { color: '#fff' }]}>Suno, Udio, Soundraw…</Text>
      </View>
    </View>
  );
}

function ArtScore() {
  return (
    <View style={{ width: 240, height: 240, alignItems: 'center', justifyContent: 'center' }}>
      <ScoreRing value={68} size={150} />
      <View style={[styles.badge, { top: 20, right: 12, backgroundColor: colors.xp, borderBottomColor: colors.xpDeep, transform: [{ rotate: '6deg' }] }]}>
        <Text style={{ fontFamily: font.black, fontSize: 13, color: '#4A3500' }}>+120 XP</Text>
      </View>
      <View style={[styles.badge, { bottom: 18, left: 8, backgroundColor: colors.streak, borderBottomColor: colors.streakDeep, transform: [{ rotate: '-5deg' }] }]}>
        <Text style={{ fontFamily: font.black, fontSize: 14, color: '#fff' }}>🔥 12</Text>
      </View>
    </View>
  );
}

function ArtClimb() {
  return (
    <Svg width={240} height={220} viewBox="0 0 240 220">
      <Rect x={92} y={70} width={56} height={120} rx={6} fill="#FFC800" stroke="#131313" strokeWidth={2.5} />
      <Rect x={28} y={108} width={56} height={82} rx={6} fill="#E5E7EB" stroke="#131313" strokeWidth={2.5} />
      <Rect x={156} y={128} width={56} height={62} rx={6} fill="#F0B280" stroke="#131313" strokeWidth={2.5} />
      <SvgText x={120} y={148} textAnchor="middle" fontFamily="Nunito_900Black" fontSize={26} fill="#4A3500">1</SvgText>
      <SvgText x={56} y={160} textAnchor="middle" fontFamily="Nunito_900Black" fontSize={20} fill="#374151">2</SvgText>
      <SvgText x={184} y={172} textAnchor="middle" fontFamily="Nunito_900Black" fontSize={18} fill="#5D2F0F">3</SvgText>
      <Circle cx={120} cy={48} r={22} fill="#1E4F6B" stroke="#131313" strokeWidth={2.5} />
      <SvgText x={120} y={53} textAnchor="middle" fontFamily="Nunito_900Black" fontSize={13} fill="#fff">YOU</SvgText>
      <Circle cx={206} cy={70} r={3.5} fill="#FF7B1F" />
      <Circle cx={30} cy={64} r={3.5} fill="#34A853" />
    </Svg>
  );
}

const SLIDES: Slide[] = [
  {
    lines: [[{ text: 'When AI gets asked,' }], [{ text: 'does it name you?', accent: true }]],
    body: 'Clerow finds the prompts your customers ask ChatGPT, Claude & Perplexity — and checks if you show up.',
    cta: 'Next',
    art: <ArtAsk />,
  },
  {
    lines: [[{ text: 'One score.' }], [{ text: 'A clear ' }, { text: 'punch list.', accent: true }]],
    body: 'See exactly where you rank, then fix it — earning XP and streaks for every win.',
    cta: 'Next',
    art: <ArtScore />,
  },
  {
    lines: [[{ text: 'Climb past' }], [{ text: 'your ' }, { text: 'rivals.', accent: true }]],
    body: 'Race your category every single day. Get cited. Stay cited.',
    cta: 'Get started',
    art: <ArtClimb />,
  },
];

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pager = useRef<PagerView>(null);
  const [page, setPage] = useState(0);

  const next = () => {
    if (page < SLIDES.length - 1) pager.current?.setPage(page + 1);
    else router.replace('/auth');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <PagerView ref={pager} style={{ flex: 1 }} initialPage={0} onPageSelected={(e) => setPage(e.nativeEvent.position)}>
        {SLIDES.map((slide, i) => (
          <View key={i} style={styles.slide}>
            <View style={styles.art}>{slide.art}</View>
            <View style={styles.dots}>
              {SLIDES.map((_, j) => (
                <View key={j} style={[styles.dot, j === i && styles.dotOn]} />
              ))}
            </View>
            <Text style={styles.title}>
              {slide.lines.map((parts, li) => (
                <Text key={li}>
                  {parts.map((p, pi) => (
                    <Text key={pi} style={p.accent ? { color: colors.navy } : undefined}>
                      {p.text}
                    </Text>
                  ))}
                  {li < slide.lines.length - 1 ? '\n' : ''}
                </Text>
              ))}
            </Text>
            <Text style={styles.body}>{slide.body}</Text>
            <Button title={slide.cta} size="lg" onPress={next} />
            {i < SLIDES.length - 1 ? (
              <Pressable onPress={() => router.replace('/auth')} style={{ marginTop: 14 }}>
                <Text style={styles.skip}>Skip</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </PagerView>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: { flex: 1, paddingHorizontal: 28, paddingTop: 40, paddingBottom: 40, alignItems: 'center' },
  art: { flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' },
  dots: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 22 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.line },
  dotOn: { width: 22, borderRadius: 999, backgroundColor: colors.navy },
  title: { fontFamily: font.black, fontSize: 30, letterSpacing: -0.6, lineHeight: 34, textAlign: 'center', color: colors.ink, marginBottom: 12 },
  body: { fontFamily: font.semibold, fontSize: 16, color: colors.ink2, lineHeight: 24, textAlign: 'center', marginBottom: 28, maxWidth: 320 },
  skip: { color: colors.ink3, fontFamily: font.extrabold, fontSize: 14 },
  bubble: { position: 'absolute', backgroundColor: '#fff', borderWidth: 2, borderColor: colors.line, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  bubbleDark: { backgroundColor: colors.navy, borderColor: colors.navy },
  bubbleText: { fontFamily: font.extrabold, fontSize: 13, color: colors.ink },
  badge: { position: 'absolute', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 11, borderBottomWidth: 3 },
});
