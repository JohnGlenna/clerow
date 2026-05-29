import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/ui';
import { colors, font, mono } from '../../theme/tokens';

const TAG_TINT: Record<string, { color: string; bg: string }> = {
  Solution: { color: '#1CB0F6', bg: '#E8F6FE' },
  Compare: { color: '#E04848', bg: '#FCEAEA' },
  Branded: { color: colors.navy, bg: colors.navySoft },
  Problem: { color: '#7C3AED', bg: '#F1EBFB' },
};

const MC = ['#10A37F', '#D97706', '#1CB0F6', '#4285F4'];
const ML = ['C', 'A', 'P', 'G'];

type Row = { q: string; tag: keyof typeof TAG_TINT; models: number[]; pos: string; win?: boolean; invisible?: boolean; losing?: boolean };
const ROWS: Row[] = [
  { q: 'best AI music generator', tag: 'Solution', models: [1, 1, 1, 0], pos: '#4' },
  { q: 'Suno vs Udio vs Soundraw', tag: 'Compare', models: [1, 1, 1, 1], pos: '#3' },
  { q: 'royalty-free AI music tool', tag: 'Solution', models: [0, 0, 0, 0], pos: '—', invisible: true },
  { q: 'Warbls review', tag: 'Branded', models: [1, 1, 1, 1], pos: '#1', win: true },
  { q: 'make a song with no instruments', tag: 'Problem', models: [0, 1, 0, 0], pos: '#6', losing: true },
  { q: 'alternatives to Suno', tag: 'Compare', models: [0, 0, 0, 0], pos: '—', invisible: true },
  { q: 'AI music for YouTube videos', tag: 'Solution', models: [1, 0, 0, 0], pos: '#5', losing: true },
];

function MiniStat({ n, l, c }: { n: string; l: string; c: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={[styles.miniStatN, { color: c }]}>{n}</Text>
      <Text style={styles.miniStatL}>{l}</Text>
    </View>
  );
}

export default function Prompts() {
  return (
    <Screen tabbed>
      <Header eyebrow="42 discovered" title="Prompts" rightIcon="search" />

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
        <MiniStat n="14" l="You appear" c={colors.success} />
        <MiniStat n="6" l="Winning" c={colors.navy} />
        <MiniStat n="22" l="Invisible" c={colors.danger} />
      </View>

      <Card pad0>
        {ROWS.map((r, i) => {
          const tint = TAG_TINT[r.tag];
          const posColor = r.invisible ? colors.danger : r.win ? colors.success : colors.ink;
          return (
            <View key={i} style={[styles.row, i < ROWS.length - 1 && styles.rowBorder]}>
              <View style={{ flexDirection: 'row', width: '100%', alignItems: 'center' }}>
                <View style={[styles.tag, { backgroundColor: tint.bg }]}>
                  <Text style={[styles.tagText, { color: tint.color }]}>{r.tag.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }} />
                <View style={[styles.posBadge, { backgroundColor: posColor }]}>
                  <Text style={styles.posText}>{r.pos}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', width: '100%', alignItems: 'center', gap: 10 }}>
                <Text style={styles.qText}>"{r.q}"</Text>
                <View style={{ flexDirection: 'row', gap: 3 }}>
                  {r.models.map((on, j) => (
                    <View key={j} style={[styles.dot, on ? { backgroundColor: MC[j], borderColor: 'transparent' } : null]}>
                      <Text style={[styles.dotText, on ? { color: '#fff' } : null]}>{ML[j]}</Text>
                    </View>
                  ))}
                </View>
              </View>
              {r.invisible || r.losing ? (
                <Pressable style={[styles.qBtn, r.invisible ? styles.qBtnXp : styles.qBtnGhost]}>
                  <Text style={[styles.qBtnText, { color: r.invisible ? '#4A3500' : colors.navy }]}>
                    {r.invisible ? 'Make quest +90 XP' : 'Boost +50 XP'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  miniStat: { flex: 1, backgroundColor: colors.paper, borderWidth: 1.5, borderColor: colors.line, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 10, alignItems: 'center' },
  miniStatN: { fontFamily: font.black, fontSize: 24, letterSpacing: -0.5 },
  miniStatL: { fontFamily: font.extrabold, fontSize: 10.5, color: colors.ink2, textTransform: 'uppercase', letterSpacing: 0.4 },
  row: { paddingVertical: 14, paddingHorizontal: 16, gap: 8, alignItems: 'flex-start' },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line2 },
  tag: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 7 },
  tagText: { fontSize: 10.5, fontFamily: font.extrabold, letterSpacing: 0.3 },
  posBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6 },
  posText: { color: '#fff', fontSize: 11, fontFamily: font.extrabold },
  qText: { flex: 1, fontFamily: font.bold, fontSize: 14, color: colors.ink },
  dot: { width: 18, height: 18, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper2, borderWidth: 1, borderColor: colors.line },
  dotText: { fontFamily: font.black, fontSize: 9, color: colors.ink3 },
  qBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 9, alignSelf: 'flex-start' },
  qBtnXp: { backgroundColor: colors.xp, borderBottomWidth: 2, borderBottomColor: colors.xpDeep },
  qBtnGhost: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.navyMid },
  qBtnText: { fontFamily: font.extrabold, fontSize: 12 },
});
