import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/ui';
import { useDashboard } from '../../lib/useApi';
import type { PromptIntent } from '../../lib/types';
import { colors, font } from '../../theme/tokens';

const TAG_TINT: Record<PromptIntent, { color: string; bg: string; label: string }> = {
  solution: { color: '#1CB0F6', bg: '#E8F6FE', label: 'SOLUTION' },
  compare: { color: '#E04848', bg: '#FCEAEA', label: 'COMPARE' },
  branded: { color: colors.navy, bg: colors.navySoft, label: 'BRANDED' },
  problem: { color: '#7C3AED', bg: '#F1EBFB', label: 'PROBLEM' },
};

function MiniStat({ n, l, c }: { n: number; l: string; c: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={[styles.miniStatN, { color: c }]}>{n}</Text>
      <Text style={styles.miniStatL}>{l}</Text>
    </View>
  );
}

export default function Prompts() {
  const { data, loading } = useDashboard();
  const prompts = data?.prompts ?? [];
  const scanned = prompts.filter((p) => p.scanned).length;

  return (
    <Screen tabbed>
      <Header eyebrow={`${prompts.length} discovered`} title="Prompts" rightIcon="search" />

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
        <MiniStat n={prompts.length} l="Discovered" c={colors.navy} />
        <MiniStat n={scanned} l="Scanned" c={colors.success} />
        <MiniStat n={Math.max(0, prompts.length - scanned)} l="To scan" c={colors.danger} />
      </View>

      {loading && !data ? (
        <View style={{ paddingTop: 40, alignItems: 'center' }}>
          <ActivityIndicator color={colors.navy} />
        </View>
      ) : prompts.length === 0 ? (
        <Card>
          <Text style={styles.muted}>Run a scan to discover the prompts your buyers ask AI.</Text>
        </Card>
      ) : (
        <Card pad0>
          {prompts.map((p, i) => {
            const tint = TAG_TINT[p.intent] ?? TAG_TINT.solution;
            return (
              <View key={p.id} style={[styles.row, i < prompts.length - 1 && styles.rowBorder]}>
                <View style={{ flexDirection: 'row', width: '100%', alignItems: 'center' }}>
                  <View style={[styles.tag, { backgroundColor: tint.bg }]}>
                    <Text style={[styles.tagText, { color: tint.color }]}>{tint.label}</Text>
                  </View>
                  {p.isPrimary ? <Text style={styles.primary}>★ PRIMARY</Text> : null}
                  <View style={{ flex: 1 }} />
                  <View style={[styles.posBadge, { backgroundColor: p.scanned ? colors.success : colors.line }]}>
                    <Text style={[styles.posText, { color: p.scanned ? '#fff' : colors.ink2 }]}>{p.scanned ? 'SCANNED' : 'PENDING'}</Text>
                  </View>
                </View>
                <Text style={styles.qText}>&quot;{p.text}&quot;</Text>
              </View>
            );
          })}
        </Card>
      )}
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
  primary: { fontFamily: font.extrabold, fontSize: 10.5, color: colors.xpDeep, marginLeft: 8, letterSpacing: 0.3 },
  posBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6 },
  posText: { fontSize: 10, fontFamily: font.extrabold, letterSpacing: 0.3 },
  qText: { fontFamily: font.bold, fontSize: 14, color: colors.ink },
  muted: { fontFamily: font.semibold, fontSize: 14, color: colors.ink2 },
});
