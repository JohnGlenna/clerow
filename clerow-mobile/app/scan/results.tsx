import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Mascot } from '../../components/Mascot';
import { Screen } from '../../components/Screen';
import { Button, Card, Callout } from '../../components/ui';
import { useDashboard } from '../../lib/useApi';
import { colors, font, mono } from '../../theme/tokens';

function verdict(score: number): string {
  if (score >= 70) return '🏆 You\'re a top recommendation';
  if (score >= 40) return '📈 You\'re showing up — room to climb';
  if (score >= 15) return '😬 You\'re barely showing up';
  return '🫥 AI doesn\'t recommend you yet';
}

export default function Results() {
  const router = useRouter();
  const { data, loading, error, refresh } = useDashboard();

  if (loading) {
    return (
      <Screen>
        <View style={{ paddingTop: 80, alignItems: 'center' }}>
          <ActivityIndicator color={colors.navy} />
        </View>
      </Screen>
    );
  }

  if (error || !data?.hasScan) {
    return (
      <Screen>
        <View style={{ paddingTop: 60, alignItems: 'center', gap: 16 }}>
          <Mascot size={64} />
          <Text style={styles.headTitle}>Couldn&apos;t load your results</Text>
          <Text style={[styles.body, { textAlign: 'center' }]}>{error ?? 'No scan found yet.'}</Text>
          <Button title="Retry" size="lg" onPress={refresh} />
        </View>
      </Screen>
    );
  }

  const score = data.score?.overall ?? 0;
  const competitors = data.competitors ?? [];
  const max = Math.max(1, ...competitors.map((c) => c.visibility));
  const domain = data.brand?.url ?? '';

  return (
    <Screen>
      <View style={styles.head}>
        <Mascot size={40} />
        <View>
          <Text style={styles.eyebrow}>Scan complete</Text>
          <Text style={styles.headTitle}>{domain}</Text>
        </View>
      </View>

      <Card style={{ backgroundColor: colors.navy, borderWidth: 0, alignItems: 'center' }}>
        <Text style={styles.scoreLabel}>YOUR AI VISIBILITY</Text>
        <Text style={styles.scoreBig}>
          {score}
          <Text style={{ fontSize: 24, color: 'rgba(255,255,255,0.6)' }}>/100</Text>
        </Text>
        <View style={styles.scorePill}>
          <Text style={{ color: '#fff', fontFamily: font.extrabold, fontSize: 12 }}>{verdict(score)}</Text>
        </View>
      </Card>

      {competitors.length > 0 && (
        <Card>
          {data.primaryPrompt ? <Text style={styles.promptTitle}>&quot;{data.primaryPrompt}&quot;</Text> : null}
          <View style={{ gap: 10 }}>
            {competitors.map((b) => (
              <View key={`${b.rank}-${b.name}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.rank}>
                  <Text style={styles.rankText}>{b.rank}</Text>
                </View>
                <View style={[styles.sw, { backgroundColor: b.isYou ? colors.navy : '#3D7BFF' }]}>
                  <Text style={styles.swText}>{b.name[0]?.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontFamily: b.isYou ? font.black : font.bold, fontSize: 14, color: b.isYou ? colors.navy : colors.ink }}>
                    {b.name}
                  </Text>
                  {b.isYou ? (
                    <View style={styles.youBadge}>
                      <Text style={{ fontSize: 9, color: '#fff', fontFamily: font.extrabold }}>YOU</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.track}>
                  <View style={{ height: '100%', borderRadius: 999, width: `${(b.visibility / max) * 100}%`, backgroundColor: b.isYou ? colors.navy : colors.ink4 }} />
                </View>
                <Text style={styles.pct}>{b.visibility}%</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {(data.tasks?.length ?? 0) > 0 && (
        <Callout emoji="🎯">
          <Text style={{ fontFamily: font.extrabold, color: colors.navy2 }}>{data.tasks!.length} fixes found. </Text>
          Knock one out today to start your streak.
        </Callout>
      )}

      <Button title="See what to fix →" size="lg" onPress={() => router.replace('/(tabs)/home')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8, paddingBottom: 16 },
  eyebrow: { fontFamily: font.extrabold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.9, color: colors.navy },
  headTitle: { fontFamily: font.black, fontSize: 22, color: colors.ink, letterSpacing: -0.4 },
  body: { color: colors.ink2, fontFamily: font.semibold, fontSize: 14 },
  scoreLabel: { fontFamily: font.extrabold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.7, color: 'rgba(255,255,255,0.8)' },
  scoreBig: { fontFamily: font.black, fontSize: 64, letterSpacing: -2.5, lineHeight: 70, color: '#fff', marginVertical: 6 },
  scorePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  promptTitle: { fontFamily: font.black, fontSize: 16, color: colors.ink, marginBottom: 14 },
  rank: { width: 22, height: 22, borderRadius: 7, backgroundColor: colors.paper2, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontFamily: mono, fontWeight: '800', fontSize: 12, color: colors.ink2 },
  sw: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  swText: { color: '#fff', fontFamily: font.black, fontSize: 12 },
  youBadge: { backgroundColor: colors.navy, borderRadius: 4, paddingVertical: 2, paddingHorizontal: 6, marginLeft: 6 },
  track: { width: 70, height: 7, borderRadius: 999, backgroundColor: colors.line, overflow: 'hidden' },
  pct: { fontFamily: mono, fontWeight: '800', fontSize: 12, width: 32, textAlign: 'right', color: colors.ink },
});
