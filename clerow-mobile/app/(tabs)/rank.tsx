import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Header } from '../../components/Header';
import { Mascot } from '../../components/Mascot';
import { Screen } from '../../components/Screen';
import { Card, Delta, Segmented, Swatch } from '../../components/ui';
import { colors, font, mono } from '../../theme/tokens';

const CAT = [
  { r: 1, name: 'Suno', sw: '#FF7A45', v: '78%', d: '+0.2', up: true },
  { r: 2, name: 'Soundraw', sw: '#3D7BFF', v: '62%', d: '+0.4', up: true },
  { r: 3, name: 'Udio', sw: '#131313', v: '54%', d: '−0.1', up: false },
  { r: 4, name: 'Warbls', sw: colors.navy, v: '47%', d: '+1.2', up: true, me: true },
  { r: 5, name: 'Amper', sw: colors.success, v: '39%', d: '+0.3', up: true },
  { r: 6, name: 'Ecrett', sw: '#A560FF', v: '28%', d: '−0.2', up: false },
];

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
  const [tab, setTab] = useState(0);
  return (
    <Screen tabbed>
      <Header eyebrow="AI music generators" title="Leaderboard" />

      <Card style={{ backgroundColor: colors.navy, borderWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Text style={{ fontFamily: font.black, fontSize: 44, letterSpacing: -1.3, color: '#fff' }}>#4</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.extrabold, fontSize: 14, color: '#fff' }}>You climbed ↑1 this week</Text>
          <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: 'rgba(255,255,255,0.8)' }}>+8% to pass Udio at #3</Text>
        </View>
        <Mascot size={48} />
      </Card>

      <Segmented options={['Category', 'Clerow users']} value={tab} onChange={setTab} />

      <Card pad0>
        {CAT.map((b, i) => (
          <View key={b.r} style={[styles.row, i < CAT.length - 1 && styles.rowBorder, b.me && { backgroundColor: colors.navySoft }]}>
            <RankBadge r={b.r} />
            <Swatch char={b.name[0]} color={b.sw} />
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontFamily: b.me ? font.black : font.bold, fontSize: 14, color: b.me ? colors.navy : colors.ink }}>{b.name}</Text>
              {b.me ? (
                <View style={styles.youBadge}>
                  <Text style={{ fontSize: 9, color: '#fff', fontFamily: font.extrabold }}>YOU</Text>
                </View>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontFamily: mono, fontWeight: '800', fontSize: 13, color: colors.ink }}>{b.v}</Text>
              <Delta value={b.d} up={b.up} />
            </View>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line2 },
  rank: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontFamily: mono, fontWeight: '800', fontSize: 12 },
  youBadge: { backgroundColor: colors.navy, borderRadius: 4, paddingVertical: 2, paddingHorizontal: 6, marginLeft: 6 },
});
