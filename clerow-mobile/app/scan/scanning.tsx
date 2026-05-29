import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Mascot } from '../../components/Mascot';
import { Screen } from '../../components/Screen';
import { colors, font } from '../../theme/tokens';

type TaskState = 'done' | 'active' | 'pending';
const TASKS: { l: string; s: TaskState }[] = [
  { l: 'Reading warbls.com', s: 'done' },
  { l: 'Discovering buyer prompts', s: 'done' },
  { l: 'Querying ChatGPT, Claude, Perplexity', s: 'active' },
  { l: 'Mapping competitors', s: 'pending' },
  { l: 'Scoring your visibility', s: 'pending' },
];

function useSpin(durationMs: number, reverse = false) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: durationMs, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [v, durationMs]);
  return v.interpolate({ inputRange: [0, 1], outputRange: reverse ? ['360deg', '0deg'] : ['0deg', '360deg'] });
}

export default function Scanning() {
  const router = useRouter();
  const spin1 = useSpin(8000);
  const spin2 = useSpin(5000, true);

  // The only wait in the flow — auto-advance to the free results.
  useFocusEffect(
    useCallback(() => {
      const t = setTimeout(() => router.replace('/scan/results'), 3600);
      return () => clearTimeout(t);
    }, [router]),
  );

  return (
    <Screen variant="white" scroll={false} topPad={64}>
      <View style={styles.orbit}>
        <Animated.View style={[styles.ring, styles.r1, { transform: [{ rotate: spin1 }] }]} />
        <Animated.View style={[styles.ring, styles.r2, { transform: [{ rotate: spin2 }] }]} />
        <View style={styles.blip} />
        <View style={styles.center}>
          <Mascot size={64} />
        </View>
      </View>
      <Text style={styles.h1}>Scanning the AI…</Text>
      <Text style={styles.body}>This is the only time you'll wait. Future scans run in the background.</Text>
      <View>
        {TASKS.map((t, i) => (
          <View key={i} style={[styles.task, t.s === 'pending' && { opacity: 0.55 }]}>
            <View
              style={[
                styles.tick,
                t.s === 'done' && { backgroundColor: colors.success },
                t.s === 'active' && { backgroundColor: colors.navy },
                t.s === 'pending' && { backgroundColor: colors.line },
              ]}
            >
              <Text style={{ color: '#fff', fontSize: 12, fontFamily: font.bold }}>
                {t.s === 'done' ? '✓' : t.s === 'active' ? '•' : ''}
              </Text>
            </View>
            <Text style={[styles.taskLabel, t.s === 'pending' && { color: colors.ink3 }]}>{t.l}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const RING = 200;
const styles = StyleSheet.create({
  orbit: { width: RING, height: RING, alignSelf: 'center', marginTop: 12, marginBottom: 28 },
  ring: { position: 'absolute', borderRadius: RING, borderWidth: 2, borderColor: colors.navyMid, borderStyle: 'dashed' },
  r1: { top: 0, left: 0, right: 0, bottom: 0 },
  r2: { top: 26, left: 26, right: 26, bottom: 26, borderStyle: 'dotted' },
  blip: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: colors.navy, top: -7, left: RING / 2 - 7, borderWidth: 4, borderColor: colors.navySoft },
  center: { position: 'absolute', top: 56, left: 56, right: 56, bottom: 56, borderRadius: RING, backgroundColor: colors.paper, borderWidth: 2, borderColor: colors.navyMid, alignItems: 'center', justifyContent: 'center' },
  h1: { textAlign: 'center', fontFamily: font.black, fontSize: 24, letterSpacing: -0.5, color: colors.ink, marginBottom: 6 },
  body: { textAlign: 'center', color: colors.ink2, fontFamily: font.semibold, fontSize: 14, marginBottom: 26, paddingHorizontal: 10 },
  task: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: colors.paper, borderWidth: 1.5, borderColor: colors.line, borderRadius: 14, marginBottom: 8 },
  tick: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  taskLabel: { fontFamily: font.bold, fontSize: 14, color: colors.ink },
});
