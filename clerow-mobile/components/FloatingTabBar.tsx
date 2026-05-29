import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from '../theme/tokens';
import { Icon, IconName } from './icons';

const LABELS: Record<string, { label: string; icon: IconName }> = {
  home: { label: 'Home', icon: 'home' },
  prompts: { label: 'Prompts', icon: 'prompts' },
  quests: { label: 'Quests', icon: 'quests' },
  rank: { label: 'Rank', icon: 'rank' },
  you: { label: 'You', icon: 'you' },
};

/** Floating liquid-glass tab bar — `.ia-tabbar` from the design. */
export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) + 6 }]} pointerEvents="box-none">
      <BlurView intensity={40} tint="light" style={styles.bar}>
        {state.routes.map((route, index) => {
          const meta = LABELS[route.name];
          if (!meta) return null;
          const focused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };
          const tint = focused ? colors.navy : colors.ink3;
          return (
            <Pressable key={route.key} style={styles.tab} onPress={onPress}>
              <Icon name={meta.icon} size={24} color={tint} />
              <Text style={[styles.label, { color: tint }]}>{meta.label}</Text>
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12 },
  bar: {
    height: 64,
    borderRadius: 26,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'rgba(255,255,255,0.72)',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { fontFamily: font.extrabold, fontSize: 10 },
});
