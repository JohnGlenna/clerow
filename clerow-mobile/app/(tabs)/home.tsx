import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Header } from '../../components/Header';
import { Mascot } from '../../components/Mascot';
import { QuestRow } from '../../components/QuestRow';
import { Screen } from '../../components/Screen';
import { Card, CardHeader, ScoreRing, SectionHeader, Sstat, StreakBanner, Swatch } from '../../components/ui';
import { api } from '../../lib/api';
import { useDashboard } from '../../lib/useApi';
import { colors, font, mono } from '../../theme/tokens';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function domainName(url?: string): string {
  if (!url) return 'your site';
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] || 'your site';
}

function positionPct(pos: number | null): number {
  return pos != null ? Math.max(0, 100 - (pos - 1) * 15) : 0;
}

export default function Home() {
  const { data, loading, error, refresh } = useDashboard();

  if (loading && !data) {
    return (
      <Screen tabbed>
        <View style={{ paddingTop: 80, alignItems: 'center' }}>
          <ActivityIndicator color={colors.navy} />
        </View>
      </Screen>
    );
  }

  const streak = data?.streak;
  const score = data?.score;
  const tasks = data?.tasks ?? [];
  const models = data?.models ?? [];

  const toggleTask = async (id: string, done: boolean) => {
    try {
      await api.patch('/api/tasks', { id, done });
      refresh();
    } catch {
      /* keep optimistic row state; refresh on next load */
    }
  };

  return (
    <Screen tabbed>
      <Header
        left={<Mascot size={42} />}
        sub="Welcome back"
        title={domainName(data?.brand?.url)}
        titleSize={23}
        rightIcon="bell"
      />

      {error && !data ? (
        <Card>
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      ) : null}

      <StreakBanner onDays={streak?.current ?? 0} days={DAY_LABELS} />

      <Card>
        <CardHeader title="AI visibility score" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
          <ScoreRing value={score?.overall ?? 0} size={116} />
          <View style={{ flex: 1, gap: 10 }}>
            <Sstat label="Visibility" value={`${score?.visibility ?? 0}%`} pct={score?.visibility ?? 0} color={colors.navy} />
            <Sstat
              label="Position"
              value={score?.position != null ? `#${score.position}` : '—'}
              pct={positionPct(score?.position ?? null)}
              color="#1CB0F6"
            />
            <Sstat label="Sentiment" value={score?.sentiment != null ? `${score.sentiment}` : '—'} pct={score?.sentiment ?? 0} color={colors.success} />
          </View>
        </View>
      </Card>

      <SectionHeader title="Today's quests" hint={`${tasks.filter((t) => !t.done).length} to go`} />
      {tasks.length === 0 ? (
        <Card>
          <Text style={styles.muted}>No quests yet — run a scan to generate fixes.</Text>
        </Card>
      ) : (
        tasks.map((t) => (
          <QuestRow key={t.id} title={t.title} meta={t.meta} xp={t.xp} initialDone={t.done} onToggle={(next) => toggleTask(t.id, next)} />
        ))
      )}

      <SectionHeader title="How AI sees you" hint={`${models.length} models`} />
      <Card pad0>
        {models.map((m, i) => (
          <View key={m.id} style={[styles.row, i < models.length - 1 && styles.rowBorder]}>
            <Swatch char={m.letter} color={m.swatch} />
            <Text style={styles.modelName}>{m.label}</Text>
            {m.locked ? (
              <Text style={styles.locked}>🔒 Upgrade</Text>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.posBadge}>
                  <Text style={{ color: '#fff', fontSize: 12, fontFamily: font.extrabold }}>
                    {m.position != null ? `#${m.position}` : '—'}
                  </Text>
                </View>
                <Text style={styles.mono}>{m.visibility != null ? `${m.visibility}%` : '—'}</Text>
              </View>
            )}
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line2 },
  modelName: { flex: 1, fontFamily: font.bold, fontSize: 14, color: colors.ink },
  posBadge: { backgroundColor: colors.ink, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 7 },
  mono: { fontFamily: mono, fontWeight: '800', fontSize: 13, color: colors.ink },
  locked: { fontFamily: font.extrabold, fontSize: 13, color: colors.ink3 },
  muted: { fontFamily: font.semibold, fontSize: 14, color: colors.ink2 },
  errorText: { fontFamily: font.semibold, fontSize: 14, color: colors.danger },
});
