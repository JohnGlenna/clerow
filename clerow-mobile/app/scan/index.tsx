import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from '../../components/icons';
import { Mascot } from '../../components/Mascot';
import { Screen } from '../../components/Screen';
import { Button, Callout } from '../../components/ui';
import { api } from '../../lib/api';
import { colors, font, mono } from '../../theme/tokens';

export default function ScanUrl() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create/attach the brand, then hand the scan off to the scanning screen.
  const start = async () => {
    if (busy) return;
    const clean = url.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    if (!clean) {
      setError('Enter your domain to scan.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { brandId } = await api.post<{ brandId: string }>('/api/brand', { url: clean });
      router.push({ pathname: '/scan/scanning', params: { brandId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
      setBusy(false);
    }
  };

  return (
    <Screen variant="white" topPad={56}>
      <View style={{ alignItems: 'center', marginBottom: 4 }}>
        <Mascot size={88} float />
      </View>
      <Text style={styles.eyebrow}>Step 1 of 2</Text>
      <Text style={styles.h1}>What site should we scan?</Text>
      <Text style={styles.body}>Paste your domain. Clerow finds the prompts your buyers ask AI — and how you rank.</Text>

      <View style={styles.urlRow}>
        <Text style={styles.px}>https://</Text>
        <TextInput
          style={styles.urlInput}
          value={url}
          onChangeText={setUrl}
          placeholder="yourstartup.com"
          placeholderTextColor={colors.ink3}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          keyboardType="url"
          onSubmitEditing={start}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={{ marginTop: 16 }}>
        <Button
          title={busy ? 'Starting…' : 'Find my prompts'}
          size="lg"
          icon={busy ? undefined : <Icon name="arrow" size={20} color="#fff" />}
          onPress={start}
        />
      </View>

      <View style={{ marginTop: 20 }}>
        <Callout emoji="🔒">We only read public pages — never anything behind a login.</Callout>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { textAlign: 'center', fontFamily: font.extrabold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.9, color: colors.navy },
  h1: { textAlign: 'center', fontFamily: font.black, fontSize: 26, letterSpacing: -0.5, color: colors.ink, marginTop: 6, marginBottom: 8 },
  body: { textAlign: 'center', color: colors.ink2, fontFamily: font.semibold, fontSize: 14.5, lineHeight: 22, marginBottom: 24 },
  error: { color: colors.danger, fontFamily: font.semibold, fontSize: 13, marginTop: 10, textAlign: 'center' },
  urlRow: { flexDirection: 'row', alignItems: 'center', height: 58, borderRadius: 16, borderWidth: 2, borderColor: colors.navyMid, backgroundColor: colors.paper, overflow: 'hidden', borderBottomWidth: 4 },
  px: { paddingLeft: 16, paddingRight: 4, fontFamily: mono, fontSize: 14, color: colors.ink3 },
  urlInput: { flex: 1, height: '100%', fontFamily: mono, fontSize: 15, color: colors.ink },
});
