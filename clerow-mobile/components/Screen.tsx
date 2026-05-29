import { ReactNode } from 'react';
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/tokens';

type Variant = 'paper2' | 'white';

/**
 * Screen shell — background + safe-area aware padding.
 * Mirrors `.ia-screen` / `.ia-body` from `ios-app.css`.
 *
 * `tabbed` leaves room for the floating tab bar.
 * `scroll={false}` renders a plain (centered-friendly) padded view.
 */
export function Screen({
  children,
  variant = 'paper2',
  tabbed = false,
  scroll = true,
  flush = false,
  contentStyle,
  topPad,
}: {
  children: ReactNode;
  variant?: Variant;
  tabbed?: boolean;
  scroll?: boolean;
  flush?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  topPad?: number;
}) {
  const insets = useSafeAreaInsets();
  const bg = variant === 'white' ? colors.paper : colors.paper2;
  const padTop = (topPad ?? 8) + insets.top;
  const padBottom = tabbed ? 110 + insets.bottom : insets.bottom + 24;
  const padH = flush ? 0 : 18;

  if (!scroll) {
    return (
      <View style={[styles.root, { backgroundColor: bg, paddingTop: padTop, paddingBottom: padBottom, paddingHorizontal: padH }, contentStyle]}>
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[{ paddingTop: padTop, paddingBottom: padBottom, paddingHorizontal: padH }, contentStyle]}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
