import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Header } from '../../components/Header';
import { Mascot } from '../../components/Mascot';
import { Screen } from '../../components/Screen';
import { Card, Swatch } from '../../components/ui';
import { useApi } from '../../lib/useApi';
import type { LeaderboardResponse } from '../../lib/types';
import { colors, font, mono } from '../../theme/tokens';

const RANK_GRAD: Record<number, [string, string]> = {
  1: ['#FFE066', '#FFB400'],
  2: ['#E5E7EB', '#9CA3AF'],
  3: ['#F0B280', '#C77B43'],
};
const RANK_TEXT: Record<number, string> = { 1: '#4A3500', 2: '#1A1A1A', 3: '#fff' };

function RankBadge({ r }: { r: number }) {
  if (RANK_GRAD[r]) {
    return (
      <LinearGradient colors={RANK_GRAD[r]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.rank}>
        <Text style={[styles.rankText, { color: RANK_TEXT[r] }]}>{r}</Text>
      </LinearGradient>
    );
  }
  return (
    <View style={[styles.rank, { backgroundColor: colors.paper2 }]}>
      <Text style={[styles.rankText, { color: colors.ink2 }]}>{r}</Text>
    </View>
  );
}

export default function Rank() {
  const { data, loading, error } = useApi<LeaderboardResponse>('/api/leaderboard');
  const rows = data?.rows ?? [];

  return (
    <Screen tabbed>
      <Header eyebrow="Your category" title="Leaderboard" />

      <Card style={{ backgroundColor: colors.navy, borderWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Text style={{ fontFamily: font.black, fontSize: 44, letterSpacing: -1.3, color: '#fff' }}>
          {data?.yourRank ? `#${data.yourRank}` : '—'}
        </Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.extrabold, fontSize: 14, color: '#fff' }}>
            {data?.yourRank ? 'Your rank in the category' : 'Not ranked yet'}
          </Text>
          <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: 'rgba(255,255,255,0.8)' }}>
            {data ? `${data.total} brands tracked` : 'Run a scan to join'}
          </Text>
        </View>
        <Mascot size={48} />
      </Card>

      {loading && !data ? (
        <View style={{ paddingTop: 40, alignItems: 'center' }}>
          <ActivityIndicator color={colors.navy} />
        </View>
      ) : error || !data?.available || rows.length === 0 ? (
        <Card>
          <Text style={styles.muted}>{error ?? 'Leaderboard unlocks once enough brands are scanned in your category.'}</Text>
        </Card>
      ) : (
        <Card pad0>
          {rows.map((b, i) => (
            <View key={`${b.rank}-${b.label}`} style={[styles.row, i < rows.length - 1 && styles.rowBorder, b.isYou && { backgroundColor: colors.navySoft }]}>
              <RankBadge r={b.rank} />
              <Swatch char={b.label[0]?.toUpperCase() ?? '?'} color={b.isYou ? colors.navy : '#3D7BFF'} />
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontFamily: b.isYou ? font.black : font.bold, fontSize: 14, color: b.isYou ? colors.navy : colors.ink }}>{b.label}</Text>
                {b.isYou ? (
                  <View style={styles.youBadge}>
                    <Text style={{ fontSize: 9, color: '#fff', fontFamily: font.extrabold }}>YOU</Text>
                  </View>
                ) : null}
              </View>
              <Text style={{ fontFamily: mono, fontWeight: '800', fontSize: 13, color: colors.ink }}>{b.visibility}%</Text>
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
  rank: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontFamily: mono, fontWeight: '800', fontSize: 12 },
  youBadge: { backgroundColor: colors.navy, borderRadius: 4, paddingVertical: 2, paddingHorizontal: 6, marginLeft: 6 },
  muted: { fontFamily: font.semibold, fontSize: 14, color: colors.ink2 },
});
