import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Header } from '../components/Header';
import { Icon } from '../components/icons';
import { Screen } from '../components/Screen';
import { Card } from '../components/ui';
import { useDashboard } from '../lib/useApi';
import { colors, font } from '../theme/tokens';

// Editorial "how to win" copy per engine (not data the API returns).
const NOTES: Record<string, string> = {
  chatgpt: 'Loves G2, Wikipedia & Reddit. Win it with comparison pages.',
  claude: 'Cites primary sources. Rewards depth in your docs.',
  perplexity: 'Most live-web driven. Reddit + YouTube move you fast.',
  gemini: 'Overlaps Google SEO. Strong technical pages help.',
};

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
  const { data, loading } = useDashboard();
  const models = data?.models ?? [];
  const tracked = models.filter((m) => !m.locked).length;

  return (
    <Screen>
      <Header
        eyebrow={`${tracked} of ${models.length || 4} tracked`}
        title="AI Models"
        left={
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="back" size={24} color={colors.ink} />
          </Pressable>
        }
      />

      {loading && !data ? (
        <View style={{ paddingTop: 40, alignItems: 'center' }}>
          <ActivityIndicator color={colors.navy} />
        </View>
      ) : (
        models.map((m) => (
          <Card key={m.id} style={m.locked ? { opacity: 0.85 } : undefined}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <View style={[styles.sw, { backgroundColor: m.swatch }]}>
                <Text style={{ color: '#fff', fontFamily: font.black, fontSize: 15 }}>{m.letter}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.black, fontSize: 16, color: colors.ink }}>{m.label}</Text>
                <Text style={{ fontFamily: font.semibold, fontSize: 12, color: colors.ink2 }}>{m.locked ? 'Locked' : 'Tracking daily'}</Text>
              </View>
              {m.locked ? (
                <View style={styles.lockBadge}>
                  <Icon name="lock" size={12} color={colors.ink2} />
                  <Text style={styles.lockText}>Upgrade</Text>
                </View>
              ) : null}
            </View>
            {!m.locked ? (
              <View style={{ flexDirection: 'row', gap: 28, marginBottom: 12 }}>
                <Mstat l="Visibility" v={m.visibility != null ? `${m.visibility}%` : '—'} />
                <Mstat l="Position" v={m.position != null ? `#${m.position}` : '—'} />
              </View>
            ) : null}
            <View style={styles.note}>
              <Text style={styles.noteText}>
                <Text style={{ fontFamily: font.extrabold, color: colors.ink }}>📚 </Text>
                {NOTES[m.id] ?? 'Tracked across your prompts.'}
              </Text>
            </View>
          </Card>
        ))
      )}
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
