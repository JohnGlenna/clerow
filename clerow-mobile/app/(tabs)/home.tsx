import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Header } from '../../components/Header';
import { Mascot } from '../../components/Mascot';
import { QuestRow } from '../../components/QuestRow';
import { Screen } from '../../components/Screen';
import { Card, CardHeader, Delta, MiniChart, ScoreRing, SectionHeader, Sstat, StreakBanner, Swatch } from '../../components/ui';
import { colors, font, mono } from '../../theme/tokens';

const MODELS = [
  { l: 'C', name: 'ChatGPT', sw: '#10A37F', pos: '#2', v: '62%', up: true, d: '+0.8' },
  { l: 'A', name: 'Claude', sw: '#D97706', pos: '#3', v: '54%', up: true, d: '+0.4' },
  { l: 'P', name: 'Perplexity', sw: '#1CB0F6', pos: '#4', v: '41%', up: false, d: '−0.2' },
  { l: 'G', name: 'Gemini', sw: '#4285F4', pos: '#5', v: '33%', up: true, d: '+0.1' },
];

export default function Home() {
  const router = useRouter();
  return (
    <Screen tabbed>
      <Header left={<Mascot size={42} />} sub="Welcome back" title="John" titleSize={23} rightIcon="bell" />

      <StreakBanner onDays={12} days={['M', 'T', 'W', 'T', 'F', 'S', 'S']} />

      <Card>
        <CardHeader title="AI visibility score" />
        <View style={{ position: 'absolute', top: 18, right: 18 }}>
          <Delta value="+12 ↑" up />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
          <ScoreRing value={68} size={116} />
          <View style={{ flex: 1, gap: 10 }}>
            <Sstat label="Visibility" value="66%" pct={66} color={colors.navy} />
            <Sstat label="Position" value="#2" pct={84} color="#1CB0F6" />
            <Sstat label="Sentiment" value="92" pct={92} color={colors.success} />
          </View>
        </View>
        <MiniChart data={[18, 22, 24, 28, 30, 34, 38, 42, 50, 68]} />
      </Card>

      <SectionHeader title="Today's quests" hint="+185 XP today" />
      <QuestRow title="Add FAQ schema to homepage" meta="≈ 10 min · done" xp={50} initialDone />
      <QuestRow title="Reply to 3 Reddit threads" meta="≈ 10 min · impact: high" xp={90} />
      <QuestRow title="Write /compare/suno page" meta="≈ 45 min · very high" xp={200} />

      <SectionHeader title="How AI sees you" hint="4 models" />
      <Card pad0>
        {MODELS.map((m, i) => (
          <View key={m.name} style={[styles.row, i < MODELS.length - 1 && styles.rowBorder]}>
            <Swatch char={m.l} color={m.sw} />
            <Text style={styles.modelName}>{m.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.posBadge}>
                <Text style={{ color: '#fff', fontSize: 12, fontFamily: font.extrabold }}>{m.pos}</Text>
              </View>
              <Text style={styles.mono}>{m.v}</Text>
              <Delta value={m.d} up={m.up} />
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
  modelName: { flex: 1, fontFamily: font.bold, fontSize: 14, color: colors.ink },
  posBadge: { backgroundColor: colors.ink, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 7 },
  mono: { fontFamily: mono, fontWeight: '800', fontSize: 13, color: colors.ink },
});
