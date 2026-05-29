import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Header } from '../components/Header';
import { Icon } from '../components/icons';
import { Screen } from '../components/Screen';
import { Card, Delta } from '../components/ui';
import { colors, font } from '../theme/tokens';

const MODELS = [
  { name: 'ChatGPT', l: 'C', sw: '#10A37F', v: 62, pos: '2.1', d: '+0.8', up: true, tracked: true, note: 'Loves G2, Wikipedia & Reddit. Win it with comparison pages.' },
  { name: 'Claude', l: 'A', sw: '#D97706', v: 54, pos: '3.4', d: '+0.4', up: true, tracked: true, note: 'Cites primary sources. Rewards depth in your docs.' },
  { name: 'Perplexity', l: 'P', sw: '#1CB0F6', v: 41, pos: '3.9', d: '−0.2', up: false, tracked: true, note: 'Most live-web driven. Reddit + YouTube move you fast.' },
  { name: 'Gemini', l: 'G', sw: '#4285F4', v: 0, pos: '—', d: '', up: true, tracked: false, note: 'Overlaps Google SEO. Unlock on the Marketing plan.' },
];

function Mstat({ l, v }: { l: string; v: string }) {
  return (
    <View>
      <Text style={styles.mstatL}>{l}</Text>
      <Text style={styles.mstatV}>{v}</Text>
    </View>
  );
}

export default function Models() {
  const router = useRouter();
  return (
    <Screen>
      <Header
        eyebrow="3 of 5 tracked"
        title="AI Models"
        left={
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="back" size={24} color={colors.ink} />
          </Pressable>
        }
      />

      {MODELS.map((m) => (
        <Card key={m.name} style={!m.tracked && { opacity: 0.85 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <View style={[styles.sw, { backgroundColor: m.sw }]}>
              <Text style={{ color: '#fff', fontFamily: font.black, fontSize: 15 }}>{m.l}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.black, fontSize: 16, color: colors.ink }}>{m.name}</Text>
              <Text style={{ fontFamily: font.semibold, fontSize: 12, color: colors.ink2 }}>{m.tracked ? 'Tracking daily' : 'Locked'}</Text>
            </View>
            {m.tracked ? (
              <Delta value={m.d} up={m.up} />
            ) : (
              <View style={styles.lockBadge}>
                <Icon name="lock" size={12} color={colors.ink2} />
                <Text style={styles.lockText}>Marketing</Text>
              </View>
            )}
          </View>
          {m.tracked ? (
            <View style={{ flexDirection: 'row', gap: 28, marginBottom: 12 }}>
              <Mstat l="Visibility" v={`${m.v}%`} />
              <Mstat l="Avg pos." v={m.pos} />
            </View>
          ) : null}
          <View style={styles.note}>
            <Text style={styles.noteText}>
              <Text style={{ fontFamily: font.extrabold, color: colors.ink }}>📚 </Text>
              {m.note}
            </Text>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sw: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  lockBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.paper2, borderWidth: 1, borderColor: colors.line, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999 },
  lockText: { fontFamily: font.extrabold, fontSize: 10.5, color: colors.ink2, textTransform: 'uppercase', letterSpacing: 0.4 },
  mstatL: { fontFamily: font.extrabold, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.5, color: colors.ink3 },
  mstatV: { fontFamily: font.black, fontSize: 22, letterSpacing: -0.3, color: colors.ink },
  note: { backgroundColor: colors.paper2, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  noteText: { fontFamily: font.semibold, fontSize: 12.5, color: colors.ink2, lineHeight: 18 },
});
