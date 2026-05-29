import { Tabs } from 'expo-router';
import { FloatingTabBar } from '../../components/FloatingTabBar';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <FloatingTabBar {...props} />}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="prompts" />
      <Tabs.Screen name="quests" />
      <Tabs.Screen name="rank" />
      <Tabs.Screen name="you" />
    </Tabs>
  );
}
