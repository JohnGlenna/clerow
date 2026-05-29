import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Header } from '../components/Header';
import { Icon } from '../components/icons';
import { MascotStatic } from '../components/Mascot';
import { Screen } from '../components/Screen';
import { Button, Card, CardHeader } from '../components/ui';
import { api } from '../lib/api';
import { useApi, useDashboard } from '../lib/useApi';
import type { HistoryResponse } from '../lib/types';
import { colors, font, mono } from '../theme/tokens';

function fmtWeek(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function sign(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

export default function Reports() {
  const router = useRouter();
  const { data: dash } = useDashboard();
  const { data: hist, loading } = useApi<HistoryResponse>('/api/reports/history');
  const [sharing, setSharing] = useState(false);

  const score = dash?.score?.overall ?? hist?.latest?.overall ?? 0;
  const deltaOverall = hist?.delta?.overall ?? 0;
  const streak = dash?.streak;
  const history = hist?.history ?? [];

  const shareProgress = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const { url } = await api.post<{ url: string }>('/api/share');
      await Share.share({ message: `My AI visibility progress on Clerow: ${url}`, url });
    } catch {
      /* user dismissed or share failed */
    } finally {
      setSharing(false);
    }
  };

  return (
    <Screen>
      <Header
        eyebrow="Your progress"
        title="Reports"
        left={
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="back" size={24} color={colors.ink} />
          </Pressable>
        }
        rightIcon="share"
        onRightPress={shareProgress}
      />

      <LinearGradient colors={[colors.navy, colors.navyDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Text style={styles.wk}>{hist?.latest ? `WEEK OF ${fmtWeek(hist.latest.captured_on).toUpperCase()}` : 'THIS WEEK'}</Text>
        <Text style={styles.heroH}>Your AI visibility score</Text>
        <Text style={styles.heroP}>
          {streak ? `🔥 ${streak.current}-day streak` : ''}
          {dash?.engine ? ` · ${dash.engine}` : ''}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 14 }}>
          <Text style={{ fontFamily: font.black, fontSize: 40, letterSpacing: -1.2, color: '#fff' }}>{score}</Text>
          {deltaOverall !== 0 ? (
            <Text style={{ color: deltaOverall > 0 ? '#7AE88A' : '#FF9B9B', fontFamily: font.extrabold, fontSize: 15, marginBottom: 6 }}>
              {sign(deltaOverall)} {deltaOverall > 0 ? '↑' : '↓'}
            </Text>
          ) : null}
        </View>
      </LinearGradient>

      <Card>
        <CardHeader title="📈 Week over week" />
        {loading && !hist ? (
          <ActivityIndicator color={colors.navy} style={{ marginVertical: 12 }} />
        ) : history.length === 0 ? (
          <Text style={styles.body}>Your weekly trend will appear here after a few daily scans.</Text>
        ) : (
          history.slice(0, 8).map((h, i) => (
            <View key={`${h.captured_on}-${i}`} style={styles.histRow}>
              <Text style={styles.histWk}>{fmtWeek(h.captured_on)}</Text>
              <Text style={styles.histRank}>{h.your_rank != null ? `#${h.your_rank}` : '—'}</Text>
              <Text style={styles.histScore}>{h.overall}</Text>
            </View>
          ))
        )}
      </Card>

      <LinearGradient colors={['#E7F0F4', '#C2DBE2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.share}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MascotStatic size={24} />
            <Text style={{ fontFamily: font.black, fontSize: 15, color: colors.ink }}>Clerow Wrapped</Text>
          </View>
          <Text style={{ fontFamily: mono, fontSize: 10, color: colors.ink2 }}>🔥 {streak?.current ?? 0}d</Text>
        </View>
        <Text style={{ fontFamily: font.black, fontSize: 30, letterSpacing: -1, color: colors.navy2 }}>{score}/100</Text>
        <Text style={{ fontFamily: font.bold, fontSize: 12.5, color: colors.navy2, marginBottom: 12 }}>your AI visibility score</Text>
        <Button title={sharing ? 'Preparing…' : 'Share your progress'} size="sm" full onPress={shareProgress} />
      </LinearGradient>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 22, padding: 22, marginBottom: 12 },
  wk: { fontFamily: font.extrabold, fontSize: 11, letterSpacing: 0.9, color: 'rgba(255,255,255,0.7)' },
  heroH: { fontFamily: font.black, fontSize: 22, letterSpacing: -0.4, lineHeight: 26, color: '#fff', marginTop: 6, marginBottom: 4 },
  heroP: { fontFamily: font.semibold, fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  body: { fontFamily: font.semibold, fontSize: 13.5, color: colors.ink2, lineHeight: 20 },
  histRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line2 },
  histWk: { flex: 1, fontFamily: font.bold, fontSize: 13, color: colors.ink },
  histRank: { width: 50, textAlign: 'right', fontFamily: mono, fontWeight: '800', fontSize: 13, color: colors.ink2 },
  histScore: { width: 50, textAlign: 'right', fontFamily: font.black, fontSize: 15, color: colors.navy },
  share: { borderRadius: 22, padding: 18, marginBottom: 12 },
});
