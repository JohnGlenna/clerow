import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { useApi } from '../lib/useApi';
import { colors } from '../theme/tokens';
import type { DashboardData } from '../lib/types';

function Splash() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}>
      <ActivityIndicator color={colors.navy} />
    </View>
  );
}

/**
 * Entry router:
 *  - no session            → onboarding (then auth)
 *  - session, no brand yet → scan (run the first scan)
 *  - session + brand       → the app
 */
export default function Index() {
  const { session, initializing } = useAuth();
  // Probe the brand only once we have a session.
  const { data, loading, error } = useApi<DashboardData>(session ? '/api/dashboard' : null);

  if (initializing) return <Splash />;
  if (!session) return <Redirect href="/onboarding" />;
  if (loading) return <Splash />;
  // If the probe failed (e.g. backend URL not set yet), fall back to scan rather
  // than trapping the user on a blank splash.
  const hasBrand = !error && !!data?.brand;
  return <Redirect href={hasBrand ? '/(tabs)/home' : '/scan'} />;
}
