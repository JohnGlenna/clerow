import { Redirect } from 'expo-router';

/** Entry point — the design's first-run is the onboarding carousel. */
export default function Index() {
  return <Redirect href="/onboarding" />;
}
