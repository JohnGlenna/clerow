import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GoogleG } from '../components/icons';
import { Mascot } from '../components/Mascot';
import { Button, Divider, OAuthButton } from '../components/ui';
import { colors, font } from '../theme/tokens';

export default function Auth() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const go = () => router.replace('/scan');

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 56, paddingBottom: insets.bottom + 24, paddingHorizontal: 22 }}>
        <View style={{ alignItems: 'center', marginBottom: 8 }}>
          <Mascot size={96} />
        </View>
        <Text style={styles.h1}>Stop being invisible to AI.</Text>
        <Text style={styles.sub}>Free scan in 60 seconds.</Text>

        <View style={{ marginBottom: 12 }}>
          <OAuthButton title="Continue with Google" icon={<GoogleG size={20} />} onPress={go} />
        </View>
        <OAuthButton title="Continue with Apple" icon={<Text style={{ fontSize: 18 }}></Text>} onPress={go} />

        <Divider label="or" />

        <TextInput
          style={styles.input}
          placeholder="you@yourstartup.com"
          placeholderTextColor={colors.ink3}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={{ marginTop: 12 }}>
          <Button title="Continue with email" size="lg" onPress={go} />
        </View>

        <Text style={styles.legal}>By continuing you agree to our Terms and Privacy Policy.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { textAlign: 'center', fontFamily: font.black, fontSize: 27, letterSpacing: -0.5, color: colors.ink, marginTop: 4, marginBottom: 6 },
  sub: { textAlign: 'center', color: colors.ink2, fontFamily: font.semibold, fontSize: 15, marginBottom: 28 },
  input: { height: 56, borderRadius: 16, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.paper, paddingHorizontal: 18, fontFamily: font.semibold, fontSize: 16, color: colors.ink },
  legal: { fontSize: 11, color: colors.ink3, textAlign: 'center', fontFamily: font.semibold, lineHeight: 16, marginTop: 14 },
});
