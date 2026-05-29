import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Header } from '../../components/Header';
import { Icon } from '../../components/icons';
import { Screen } from '../../components/Screen';
import { Card, SectionHeader } from '../../components/ui';
import { colors, font } from '../../theme/tokens';

type MedalType = 'gold' | 'silver' | 'bronze' | 'locked';
const MEDAL_GRAD: Record<Exclude<MedalType, 'locked'>, [string, string]> = {
  gold: ['#FFE066', '#FFB400'],
  silver: ['#E5E7EB', '#9CA3AF'],
  bronze: ['#F0B280', '#C77B43'],
};

function Medal({ t, ico, nm }: { t: MedalType; ico: string; nm: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 5 }}>
      {t === 'locked' ? (
        <View style={[styles.medal, { backgroundColor: colors.paper2, opacity: 0.6 }]}>
          <Text style={{ fontSize: 22 }}>{ico}</Text>
        </View>
      ) : (
        <LinearGradient colors={MEDAL_GRAD[t]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.medal}>
          <Text style={{ fontSize: 22 }}>{ico}</Text>
        </LinearGradient>
      )}
      <Text style={styles.medalName}>{nm}</Text>
    </View>
  );
}

function Pstat({ n, l }: { n: string; l: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontFamily: font.black, fontSize: 18, color: colors.ink, letterSpacing: -0.2 }}>{n}</Text>
      <Text style={{ fontFamily: font.extrabold, fontSize: 11, color: colors.ink3, textTransform: 'uppercase', letterSpacing: 0.4 }}>{l}</Text>
    </View>
  );
}

function PrefRow({ ico, t, detail, danger, last, onPress }: { ico: ReactNode; t: string; detail?: string; danger?: boolean; last?: boolean; onPress?: () => void }) {
  return (
    <Pressable style={[styles.prefRow, !last && styles.prefBorder]} onPress={onPress}>
      <View style={{ width: 26, alignItems: 'center' }}>{ico}</View>
      <Text style={[styles.prefTitle, danger && { color: colors.danger }]}>{t}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {detail ? <Text style={styles.prefDetail}>{detail}</Text> : null}
        {!danger ? <Icon name="chevron" size={16} color={colors.ink4} /> : null}
      </View>
    </Pressable>
  );
}

export default function You() {
  const router = useRouter();
  return (
    <Screen tabbed>
      <Header title="You" rightIcon="settings" />

      <Card style={{ alignItems: 'center' }}>
        <View style={{ position: 'relative', marginBottom: 10 }}>
          <View style={styles.avatar}>
            <Text style={{ color: '#fff', fontFamily: font.black, fontSize: 30 }}>J</Text>
          </View>
        </View>
        <Text style={{ fontFamily: font.black, fontSize: 20, color: colors.ink }}>John Solbakken</Text>
        <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.ink2 }}>warbls.com</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 26, marginTop: 16 }}>
          <Pstat n="7,402" l="XP" />
          <Pstat n="🔥 12" l="Streak" />
          <Pstat n="5" l="Badges" />
        </View>
      </Card>

      <SectionHeader title="Achievements" hint="5 of 24" />
      <Card>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Medal t="gold" ico="🏆" nm="First cite" />
          <Medal t="silver" ico="📜" nm="Schema" />
          <Medal t="bronze" ico="⚡" nm="Quick fix" />
          <Medal t="gold" ico="📈" nm="Trending" />
          <Medal t="locked" ico="🔒" nm="30 days" />
        </View>
      </Card>

      <SectionHeader title="More insights" />
      <Card pad0>
        <PrefRow ico={<Text style={{ fontSize: 18 }}>🔎</Text>} t="Sources" detail="12 tracked" onPress={() => router.push('/sources')} />
        <PrefRow ico={<Text style={{ fontSize: 18 }}>🤖</Text>} t="AI Models" detail="3 of 5" onPress={() => router.push('/models')} />
        <PrefRow ico={<Text style={{ fontSize: 18 }}>📊</Text>} t="Reports" detail="Weekly" last onPress={() => router.push('/reports')} />
      </Card>

      <Card pad0>
        <PrefRow ico={<Text style={{ fontSize: 18 }}>💎</Text>} t="Your plan" detail="Founder" onPress={() => router.push('/paywall')} />
        <PrefRow ico={<Text style={{ fontSize: 18 }}>🔔</Text>} t="Notifications" detail="On" />
        <PrefRow ico={<Text style={{ fontSize: 18 }}>🌐</Text>} t="Domain" detail="warbls.com" />
        <PrefRow ico={<Text style={{ fontSize: 18 }}>↩︎</Text>} t="Sign out" danger last onPress={() => router.replace('/auth')} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  medal: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  medalName: { fontFamily: font.extrabold, fontSize: 10, color: colors.ink2 },
  prefRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  prefBorder: { borderBottomWidth: 1, borderBottomColor: colors.line2 },
  prefTitle: { flex: 1, fontFamily: font.bold, fontSize: 14, color: colors.ink },
  prefDetail: { fontFamily: font.bold, fontSize: 13, color: colors.ink2 },
});
