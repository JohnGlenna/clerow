import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../components/icons';
import { Mascot } from '../../components/Mascot';
import { Screen } from '../../components/Screen';
import { Button, Card, Callout } from '../../components/ui';
import { colors, font, mono } from '../../theme/tokens';

const BRANDS = [
  { rank: 1, name: 'Suno', sw: '#FF7A45', v: 30, me: false },
  { rank: 2, name: 'Soundraw', sw: '#3D7BFF', v: 19, me: false },
  { rank: 3, name: 'Udio', sw: '#131313', v: 16, me: false },
  { rank: 4, name: 'Warbls', sw: colors.navy, v: 6, me: true },
  { rank: 5, name: 'Amper', sw: colors.success, v: 4, me: false },
];
const MAX = 30;

export default function Results() {
  const router = useRouter();
  return (
    <Screen>
      <View style={styles.head}>
        <Mascot size={40} />
        <View>
          <Text style={styles.eyebrow}>Scan complete</Text>
          <Text style={styles.headTitle}>warbls.com</Text>
        </View>
      </View>

      <Card style={{ backgroundColor: colors.navy, borderWidth: 0, alignItems: 'center' }}>
        <Text style={styles.scoreLabel}>YOUR AI VISIBILITY</Text>
        <Text style={styles.scoreBig}>
          18<Text style={{ fontSize: 24, color: 'rgba(255,255,255,0.6)' }}>/100</Text>
        </Text>
        <View style={styles.scorePill}>
          <Text style={{ color: '#fff', fontFamily: font.extrabold, fontSize: 12 }}>😬 You're barely showing up</Text>
        </View>
      </Card>

      <Card>
        <Text style={styles.promptTitle}>"best AI music generator?"</Text>
        <View style={{ gap: 10 }}>
          {BRANDS.map((b) => (
            <View key={b.rank} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.rank}>
                <Text style={styles.rankText}>{b.rank}</Text>
              </View>
              <View style={[styles.sw, { backgroundColor: b.sw }]}>
                <Text style={styles.swText}>{b.name[0]}</Text>
              </View>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontFamily: b.me ? font.black : font.bold, fontSize: 14, color: b.me ? colors.navy : colors.ink }}>{b.name}</Text>
                {b.me ? (
                  <View style={styles.youBadge}>
                    <Text style={{ fontSize: 9, color: '#fff', fontFamily: font.extrabold }}>YOU</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.track}>
                <View style={{ height: '100%', borderRadius: 999, width: `${(b.v / MAX) * 100}%`, backgroundColor: b.me ? colors.navy : colors.ink4 }} />
              </View>
              <Text style={styles.pct}>{b.v}%</Text>
            </View>
          ))}
        </View>
      </Card>

      <Callout emoji="🎯">
        <Text style={{ fontFamily: font.extrabold, color: colors.navy2 }}>12 fixes found. </Text>
        The first one takes 10 minutes and could put you on the board.
      </Callout>

      <Button title="See what to fix →" size="lg" onPress={() => router.replace('/(tabs)/home')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8, paddingBottom: 16 },
  eyebrow: { fontFamily: font.extrabold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.9, color: colors.navy },
  headTitle: { fontFamily: font.black, fontSize: 22, color: colors.ink, letterSpacing: -0.4 },
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
