import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Header } from '../../components/Header';
import { QuestRow } from '../../components/QuestRow';
import { Screen } from '../../components/Screen';
import { Card, SectionHeader, StreakBanner } from '../../components/ui';
import { api } from '../../lib/api';
import { useDashboard } from '../../lib/useApi';
import { colors, font } from '../../theme/tokens';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function Quests() {
  const { data, loading, refresh } = useDashboard();

  const tasks = data?.tasks ?? [];
  const streak = data?.streak;
  const today = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  const toggleTask = async (id: string, isDone: boolean) => {
    try {
      await api.patch('/api/tasks', { id, done: isDone });
      refresh();
    } catch {
      /* optimistic row remains; refresh on next load */
    }
  };

  return (
    <Screen tabbed>
      <Header
        eyebrow={streak ? `🔥 ${streak.current}-day streak` : 'Quests'}
        title="Quests"
        right={
          <View style={styles.flame}>
            <Text style={{ fontSize: 20 }}>🔥</Text>
          </View>
        }
      />

      <StreakBanner onDays={streak?.current ?? 0} days={DAY_LABELS} />

      {loading && !data ? (
        <View style={{ paddingTop: 40, alignItems: 'center' }}>
          <ActivityIndicator color={colors.navy} />
        </View>
      ) : (
        <>
          <SectionHeader title="Today's quests" hint={`${today.length} to go`} />
          {today.length === 0 ? (
            <Card>
              <Text style={styles.muted}>
                {tasks.length === 0 ? 'Run a scan to generate your quests.' : 'All done today — streak secured. 🔥'}
              </Text>
            </Card>
          ) : (
            today.map((t) => (
              <QuestRow key={t.id} title={t.title} meta={t.meta} xp={t.xp} initialDone={false} onToggle={(next) => toggleTask(t.id, next)} />
            ))
          )}

          {done.length > 0 && (
            <>
              <SectionHeader title="Completed" hint={`${done.length}`} />
              {done.map((t) => (
                <QuestRow key={t.id} title={t.title} meta={t.meta} xp={t.xp} initialDone onToggle={(next) => toggleTask(t.id, next)} />
              ))}
            </>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flame: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.streak, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: colors.streakDeep },
  muted: { fontFamily: font.semibold, fontSize: 14, color: colors.ink2 },
});
