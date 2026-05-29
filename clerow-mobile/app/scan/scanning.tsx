import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Mascot } from '../../components/Mascot';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/ui';
import { api } from '../../lib/api';
import type { DiscoverResponse, RunResponse } from '../../lib/types';
import { colors, font } from '../../theme/tokens';

const STEPS = [
  'Reading your site',
  'Discovering buyer prompts',
  'Querying the AI engines',
  'Mapping competitors',
  'Scoring your visibility',
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
  const { brandId } = useLocalSearchParams<{ brandId: string }>();
  const spin1 = useSpin(8000);
  const spin2 = useSpin(5000, true);

  const [progress, setProgress] = useState(0); // index of the active step
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const run = async () => {
    if (!brandId) {
      setError('Missing brand — go back and try again.');
      return;
    }
    setError(null);
    try {
      setProgress(1);
      await api.post<DiscoverResponse>('/api/scan/discover', { brandId });
      setProgress(2);
      await api.post<RunResponse>('/api/scan/run', { brandId });
      setProgress(STEPS.length);
      router.replace('/scan/results');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The scan failed. Try again.');
    }
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      {error ? (
        <>
          <Text style={styles.h1}>Scan failed</Text>
          <Text style={styles.body}>{error}</Text>
          <View style={{ gap: 10, marginTop: 8 }}>
            <Button title="Try again" size="lg" onPress={() => { started.current = true; run(); }} />
            <Button title="Back" variant="ghost" size="lg" onPress={() => router.back()} />
          </View>
        </>
      ) : (
        <>
          <Text style={styles.h1}>Scanning the AI…</Text>
          <Text style={styles.body}>This is the only time you&apos;ll wait. Future scans run in the background.</Text>
          <View>
            {STEPS.map((label, i) => {
              const state = i < progress ? 'done' : i === progress ? 'active' : 'pending';
              return (
                <View key={i} style={[styles.task, state === 'pending' && { opacity: 0.55 }]}>
                  <View
                    style={[
                      styles.tick,
                      state === 'done' && { backgroundColor: colors.success },
                      state === 'active' && { backgroundColor: colors.navy },
                      state === 'pending' && { backgroundColor: colors.line },
                    ]}
                  >
                    <Text style={{ color: '#fff', fontSize: 12, fontFamily: font.bold }}>
                      {state === 'done' ? '✓' : state === 'active' ? '•' : ''}
                    </Text>
                  </View>
                  <Text style={[styles.taskLabel, state === 'pending' && { color: colors.ink3 }]}>{label}</Text>
                </View>
              );
            })}
          </View>
        </>
      )}
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
