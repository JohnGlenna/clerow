import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Header } from '../components/Header';
import { Icon } from '../components/icons';
import { Screen } from '../components/Screen';
import { Card, Callout } from '../components/ui';
import { useApi } from '../lib/useApi';
import type { SourcesResponse } from '../lib/types';
import { colors, font, mono } from '../theme/tokens';

const TYPE_COLOR: Record<string, string> = {
  UGC: '#7C3AED',
  Directory: colors.navy,
  Editorial: '#1CB0F6',
  Yours: colors.success,
  Other: colors.ink3,
};

export default function Sources() {
  const router = useRouter();
  const { data, loading, error } = useApi<SourcesResponse>('/api/sources');
  const sources = data?.sources ?? [];

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
        Get cited where your rivals already are.
      </Callout>

      {loading && !data ? (
        <View style={{ paddingTop: 40, alignItems: 'center' }}>
          <ActivityIndicator color={colors.navy} />
        </View>
      ) : error || sources.length === 0 ? (
        <Card>
          <Text style={styles.muted}>{error ?? 'No sources yet — run a scan to see where AI pulls answers.'}</Text>
        </Card>
      ) : (
        <Card pad0>
          {sources.map((r, i) => (
            <View key={r.domain} style={[styles.row, i < sources.length - 1 && styles.rowBorder]}>
              <View style={[styles.sw, { backgroundColor: TYPE_COLOR[r.type] ?? colors.ink3 }]}>
                <Text style={styles.swText}>{r.type[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.domain}>{r.domain}</Text>
                <Text style={styles.sub}>
                  {r.isYours ? (
                    <Text style={{ color: colors.success, fontFamily: font.extrabold }}>Yours · cited {r.citedCount}×</Text>
                  ) : (
                    `${r.note || `Cited in ${r.citedPct}% of answers`}`
                  )}
                </Text>
              </View>
              {r.isYours ? (
                <Text style={{ color: colors.success, fontFamily: font.extrabold, fontSize: 12 }}>Yours ✓</Text>
              ) : r.xp > 0 ? (
                <View style={styles.xp}>
                  <Text style={styles.xpText}>+{r.xp}</Text>
                </View>
              ) : null}
            </View>
          ))}
        </Card>
      )}
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
  muted: { fontFamily: font.semibold, fontSize: 14, color: colors.ink2 },
});
