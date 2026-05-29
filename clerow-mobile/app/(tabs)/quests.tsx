import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Header } from '../../components/Header';
import { QuestRow } from '../../components/QuestRow';
import { Screen } from '../../components/Screen';
import { Card, LevelBar, SectionHeader } from '../../components/ui';
import { colors, font, mono } from '../../theme/tokens';

const DAILY = [
  { ico: '🔄', t: 'Re-scan your domain', m: '1 min', xp: 15, done: true },
  { ico: '💬', t: 'Reply to 3 Reddit threads', m: '10 min · high', xp: 90 },
  { ico: '📣', t: 'Post 1 customer win to X', m: '8 min · medium', xp: 35 },
];

export default function Quests() {
  return (
    <Screen tabbed>
      <Header
        eyebrow="+185 XP today"
        title="Quests"
        right={
          <View style={styles.flame}>
            <Text style={{ fontSize: 20 }}>🔥</Text>
          </View>
        }
      />

      <LevelBar level="⚡ Level 7 · SEO Apprentice" pct={74} xp="740 / 1000" weekly="+120 this week" next="→ SEO Mage" />

      <SectionHeader title="Today's quests" hint="refreshes 9:00" />
      {DAILY.map((q) => (
        <QuestRow key={q.t} emoji={q.ico} title={q.t} meta={q.m} xp={q.xp} initialDone={q.done} />
      ))}

      <SectionHeader title="Active quest" hint="2 of 5" />
      <Card>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <View style={[styles.icoBox, { backgroundColor: colors.navySoft }]}>
            <Text style={{ fontSize: 22 }}>🥊</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.activeTitle}>Win the comparison prompts</Text>
            <Text style={styles.activeSub}>Suno · Udio · Soundraw pages</Text>
          </View>
          <View style={styles.xpPill}>
            <Text style={styles.xpPillText}>+240</Text>
          </View>
        </View>
        <View style={styles.prog}>
          <LinearGradient colors={['#7ADC2A', colors.success]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: '100%', borderRadius: 999, width: '40%' }} />
        </View>
        <Text style={styles.why}>
          <Text style={{ color: colors.navy, fontFamily: font.extrabold }}>Why: </Text>
          comparison pages drive 38% of citations in your niche.
        </Text>
      </Card>

      <SectionHeader title="Milestones" hint="rare · big XP" />
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <LinearGradient colors={['#FFE066', '#FFB400']} style={styles.icoBox}>
          <Text style={{ fontSize: 22 }}>💯</Text>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.black, fontSize: 14.5, color: colors.ink }}>Hit visibility score 80</Text>
          <View style={[styles.prog, { marginTop: 6 }]}>
            <LinearGradient colors={['#FFE266', colors.xp]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: '100%', borderRadius: 999, width: '68%' }} />
          </View>
        </View>
        <Text style={{ fontFamily: mono, fontWeight: '800', fontSize: 13, color: colors.navy }}>+600</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flame: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.streak, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: colors.streakDeep },
  icoBox: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  activeTitle: { fontFamily: font.black, fontSize: 15, color: colors.ink },
  activeSub: { fontFamily: font.semibold, fontSize: 12.5, color: colors.ink2 },
  xpPill: { backgroundColor: colors.xp, borderRadius: 9, paddingVertical: 6, paddingHorizontal: 10, borderBottomWidth: 2, borderBottomColor: colors.xpDeep },
  xpPillText: { fontFamily: mono, fontWeight: '800', fontSize: 12, color: '#4A3500' },
  prog: { height: 8, borderRadius: 999, backgroundColor: colors.line, overflow: 'hidden', marginTop: 10 },
  why: { fontFamily: font.bold, fontSize: 12, color: colors.ink2, marginTop: 8, lineHeight: 17 },
});
