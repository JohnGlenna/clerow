import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GoogleG } from '../components/icons';
import { Mascot } from '../components/Mascot';
import { OAuthButton } from '../components/ui';
import { useAuth } from '../lib/auth';
import { colors, font } from '../theme/tokens';

export default function Auth() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, signInWithGoogle, signInWithApple } = useAuth();
  const [busy, setBusy] = useState<null | 'google' | 'apple'>(null);
  const [error, setError] = useState<string | null>(null);

  // Once a session lands (OAuth success), let the index router decide where to go.
  useEffect(() => {
    if (session) router.replace('/');
  }, [session, router]);

  const run = async (provider: 'google' | 'apple', fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(provider);
    setError(null);
    try {
      await fn();
    } catch (e) {
      // Apple/Google cancellation throws a benign error — don't shout about it.
      const msg = e instanceof Error ? e.message : 'Sign-in failed';
      if (!/cancel/i.test(msg)) setError(msg);
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 56, paddingBottom: insets.bottom + 24, paddingHorizontal: 22 }}>
        <View style={{ alignItems: 'center', marginBottom: 8 }}>
          <Mascot size={96} />
        </View>
        <Text style={styles.h1}>Stop being invisible to AI.</Text>
        <Text style={styles.sub}>Sign in to start your free scan.</Text>

        <View style={{ marginBottom: 12 }}>
          <OAuthButton
            title={busy === 'google' ? 'Connecting…' : 'Continue with Google'}
            icon={<GoogleG size={20} />}
            onPress={() => run('google', signInWithGoogle)}
          />
        </View>

        {Platform.OS === 'ios' && (
          <OAuthButton
            title={busy === 'apple' ? 'Connecting…' : 'Continue with Apple'}
            icon={<Text style={{ fontSize: 18 }}></Text>}
            onPress={() => run('apple', signInWithApple)}
          />
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.legal}>By continuing you agree to our Terms and Privacy Policy.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { textAlign: 'center', fontFamily: font.black, fontSize: 27, letterSpacing: -0.5, color: colors.ink, marginTop: 4, marginBottom: 6 },
  sub: { textAlign: 'center', color: colors.ink2, fontFamily: font.semibold, fontSize: 15, marginBottom: 28 },
  error: { color: colors.danger, fontFamily: font.semibold, fontSize: 13, textAlign: 'center', marginTop: 14 },
  legal: { fontSize: 11, color: colors.ink3, textAlign: 'center', fontFamily: font.semibold, lineHeight: 16, marginTop: 14 },
});
