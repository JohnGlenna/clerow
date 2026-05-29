import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { MascotStatic } from '../components/Mascot';
import { Button } from '../components/ui';
import { api } from '../lib/api';
import { colors, font } from '../theme/tokens';

// `plan` values match clerow-web's billing checkout (founder | team | enterprise).
const PLANS = [
  { name: 'Founder', plan: 'founder', desc: 'For solo founders', price: 29 },
  { name: 'Marketing', plan: 'team', desc: 'Teams up to 5 seats', price: 89, tag: 'Popular' },
  { name: 'Enterprise', plan: 'enterprise', desc: 'Unlimited seats', price: 249 },
];

export default function Paywall() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stripe Checkout is a hosted web page — open it in an in-app browser.
  const checkout = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { url } = await api.post<{ url: string }>('/api/billing/checkout', { plan: PLANS[selected].plan });
      await WebBrowser.openBrowserAsync(url);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start checkout.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <Pressable style={styles.backdrop} onPress={() => router.back()} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.grab} />
        <View style={{ alignItems: 'center', marginBottom: 6 }}>
          <MascotStatic size={72} />
        </View>
        <Text style={styles.title}>Unlock your full playbook</Text>
        <Text style={styles.sub}>Quests, sources, all AI models & weekly reports.</Text>

        {PLANS.map((p, i) => {
          const on = i === selected;
          return (
            <Pressable key={p.name} style={[styles.plan, on && styles.planOn]} onPress={() => setSelected(i)}>
              <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.radioDot} /> : null}</View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.planName}>{p.name}</Text>
                  {p.tag ? (
                    <View style={styles.planTag}>
                      <Text style={styles.planTagText}>{p.tag.toUpperCase()}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.planDesc}>{p.desc}</Text>
              </View>
              <Text style={styles.planPrice}>
                ${p.price}
                <Text style={styles.planPer}>/mo</Text>
              </Text>
            </Pressable>
          );
        })}

        <View style={{ marginTop: 8 }}>
          <Button title={busy ? 'Opening checkout…' : `Get ${PLANS[selected].name} plan`} size="lg" onPress={checkout} />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.legal}>Cancel anytime · billed monthly</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,20,30,0.45)' },
  sheet: { backgroundColor: colors.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 18, paddingTop: 12 },
  grab: { width: 40, height: 5, borderRadius: 999, backgroundColor: colors.ink4, alignSelf: 'center', marginBottom: 16 },
  title: { textAlign: 'center', fontFamily: font.black, fontSize: 23, letterSpacing: -0.4, color: colors.ink, marginBottom: 4 },
  sub: { textAlign: 'center', fontFamily: font.semibold, fontSize: 14, color: colors.ink2, marginBottom: 20 },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderColor: colors.line, borderRadius: 16, padding: 14, marginBottom: 10 },
  planOn: { borderColor: colors.navy, backgroundColor: colors.navySoft },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.line2, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.navy },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.navy },
  planName: { fontFamily: font.black, fontSize: 15, color: colors.ink },
  planTag: { backgroundColor: colors.navy, borderRadius: 5, paddingVertical: 2, paddingHorizontal: 7, marginLeft: 6 },
  planTagText: { fontSize: 9.5, fontFamily: font.extrabold, color: '#fff', letterSpacing: 0.4 },
  planDesc: { fontFamily: font.semibold, fontSize: 12, color: colors.ink2 },
  planPrice: { fontFamily: font.black, fontSize: 18, color: colors.ink },
  planPer: { fontFamily: font.bold, fontSize: 11, color: colors.ink3 },
  error: { fontSize: 12, color: colors.danger, textAlign: 'center', fontFamily: font.semibold, marginTop: 10 },
  legal: { fontSize: 11, color: colors.ink3, textAlign: 'center', fontFamily: font.semibold, marginTop: 14 },
});
