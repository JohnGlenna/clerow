import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Header } from '../components/Header';
import { Icon } from '../components/icons';
import { MascotStatic } from '../components/Mascot';
import { Screen } from '../components/Screen';
import { Button, Card, CardHeader } from '../components/ui';
import { colors, font, mono } from '../theme/tokens';

export default function Reports() {
  const router = useRouter();
  return (
    <Screen>
      <Header
        eyebrow="Every Monday"
        title="Reports"
        left={
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="back" size={24} color={colors.ink} />
          </Pressable>
        }
        rightIcon="share"
      />

      <LinearGradient colors={[colors.navy, colors.navyDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Text style={styles.wk}>WEEK OF MAR 16</Text>
        <Text style={styles.heroH}>You climbed 2 spots in ChatGPT.</Text>
        <Text style={styles.heroP}>+8 visibility · 5 quests shipped · streak intact</Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 14 }}>
          <Text style={{ fontFamily: font.black, fontSize: 40, letterSpacing: -1.2, color: '#fff' }}>68</Text>
          <Text style={{ color: '#7AE88A', fontFamily: font.extrabold, fontSize: 15, marginBottom: 6 }}>+8 ↑</Text>
        </View>
      </LinearGradient>

      <Card>
        <CardHeader title="🏆 Biggest win" />
        <Text style={styles.body}>
          <Text style={{ color: colors.ink, fontFamily: font.extrabold }}>You overtook Amper in ChatGPT. </Text>
          Your /compare/suno page + 5 Reddit answers did it.
        </Text>
      </Card>

      <Card>
        <CardHeader title="🎯 Next opportunity" />
        <Text style={styles.body}>
          Get listed on <Text style={{ color: colors.ink, fontFamily: font.extrabold }}>G2 + Capterra</Text>. Est.{' '}
          <Text style={{ color: colors.navy, fontFamily: font.extrabold }}>+18 points</Text> within 4 weeks.
        </Text>
      </Card>

      <LinearGradient colors={['#E7F0F4', '#C2DBE2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.share}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MascotStatic size={24} />
            <Text style={{ fontFamily: font.black, fontSize: 15, color: colors.ink }}>Clerow Wrapped</Text>
          </View>
          <Text style={{ fontFamily: mono, fontSize: 10, color: colors.ink2 }}>WEEK 11</Text>
        </View>
        <Text style={{ fontFamily: font.black, fontSize: 30, letterSpacing: -1, color: colors.navy2 }}>↑ #6 → #4</Text>
        <Text style={{ fontFamily: font.bold, fontSize: 12.5, color: colors.navy2, marginBottom: 12 }}>in your category · last 30 days</Text>
        <Button title="𝕏 Share your climb" size="sm" full />
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
  share: { borderRadius: 22, padding: 18, marginBottom: 12 },
});
