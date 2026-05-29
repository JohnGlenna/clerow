import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Header } from '../components/Header';
import { Icon } from '../components/icons';
import { Screen } from '../components/Screen';
import { Card, Callout } from '../components/ui';
import { colors, font, mono } from '../theme/tokens';

const ROWS = [
  { d: 'reddit.com', type: 'UGC', tc: '#7C3AED', you: 0, rival: 'Suno', q: 90 },
  { d: 'g2.com', type: 'Directory', tc: colors.navy, you: 0, rival: 'Soundraw', q: 150 },
  { d: 'youtube.com', type: 'UGC', tc: '#7C3AED', you: 0, rival: 'Udio', q: 200 },
  { d: 'producthunt.com', type: 'Directory', tc: colors.navy, you: 1, rival: 'Suno', q: 40 },
  { d: 'warbls.com/blog', type: 'Yours', tc: colors.success, you: 6, rival: '—', q: 0 },
];

export default function Sources() {
  const router = useRouter();
  return (
    <Screen>
      <Header
        eyebrow="Where AI gets answers"
        title="Sources"
        left={
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="back" size={24} color={colors.ink} />
          </Pressable>
        }
      />

      <Callout emoji="💡">
        <Text style={{ fontFamily: font.extrabold, color: colors.navy2 }}>Sources are where you win. </Text>
        Fix the top 3 gaps → est. +18 visibility points.
      </Callout>

      <Card pad0>
        {ROWS.map((r, i) => {
          const gap = r.you === 0;
          return (
            <View key={r.d} style={[styles.row, i < ROWS.length - 1 && styles.rowBorder]}>
              <View style={[styles.sw, { backgroundColor: r.tc }]}>
                <Text style={styles.swText}>{r.type[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.domain}>{r.d}</Text>
                <Text style={styles.sub}>
                  {gap ? <Text style={{ color: colors.danger, fontFamily: font.extrabold }}>Not cited · {r.rival} is</Text> : `You: cited ${r.you}×`}
                </Text>
              </View>
              {r.q > 0 ? (
                <View style={styles.xp}>
                  <Text style={styles.xpText}>+{r.q}</Text>
                </View>
              ) : (
                <Text style={{ color: colors.success, fontFamily: font.extrabold, fontSize: 12 }}>Yours ✓</Text>
              )}
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line2 },
  sw: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  swText: { color: '#fff', fontFamily: font.black, fontSize: 12 },
  domain: { fontFamily: mono, fontWeight: '800', fontSize: 13, color: colors.ink },
  sub: { fontFamily: font.semibold, fontSize: 12, color: colors.ink2, marginTop: 2 },
  xp: { backgroundColor: colors.xp, borderRadius: 9, paddingVertical: 6, paddingHorizontal: 10, borderBottomWidth: 2, borderBottomColor: colors.xpDeep },
  xpText: { fontFamily: mono, fontWeight: '800', fontSize: 11, color: '#4A3500' },
});
