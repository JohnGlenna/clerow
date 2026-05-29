import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, mono } from '../theme/tokens';
import { Icon } from './icons';

/**
 * Quest row — `.ia-quest`. Tappable to toggle done (prototype behaviour).
 * Pass `emoji` for the icon-box variant; omit it for the checkbox variant.
 */
export function QuestRow({
  title,
  meta,
  xp,
  emoji,
  initialDone = false,
  onToggle,
}: {
  title: string;
  meta: string;
  xp: number;
  emoji?: string;
  initialDone?: boolean;
  onToggle?: (next: boolean) => void;
}) {
  const [done, setDone] = useState(initialDone);
  const toggle = () => {
    const next = !done;
    setDone(next);
    onToggle?.(next);
  };
  return (
    <Pressable style={[styles.quest, done && styles.questDone]} onPress={toggle}>
      {emoji ? (
        <View style={styles.icoBox}>
          <Text style={{ fontSize: 22 }}>{emoji}</Text>
        </View>
      ) : (
        <View style={[styles.checkbox, done && styles.checkboxDone]}>{done ? <Icon name="check" size={16} color="#fff" /> : null}</View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, done && styles.titleDone]}>{title}</Text>
        <Text style={styles.meta}>{meta}</Text>
      </View>
      <View style={[styles.xp, done && styles.xpDone]}>
        <Text style={[styles.xpText, done && { color: '#fff' }]}>{done ? '✓' : `+${xp}`}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  quest: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.paper, borderWidth: 1.5, borderColor: colors.line, borderRadius: 16, padding: 14, marginBottom: 10 },
  questDone: {},
  icoBox: { width: 44, height: 44, borderRadius: 13, backgroundColor: colors.paper2, alignItems: 'center', justifyContent: 'center' },
  checkbox: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: colors.line, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  checkboxDone: { backgroundColor: colors.success, borderColor: colors.success },
  title: { fontFamily: font.extrabold, fontSize: 14.5, color: colors.ink, letterSpacing: -0.1 },
  titleDone: { textDecorationLine: 'line-through', color: colors.ink3 },
  meta: { fontFamily: font.semibold, fontSize: 12, color: colors.ink2, marginTop: 2 },
  xp: { backgroundColor: colors.xp, borderRadius: 9, paddingVertical: 6, paddingHorizontal: 10, borderBottomWidth: 2, borderBottomColor: colors.xpDeep },
  xpDone: { backgroundColor: colors.success, borderBottomColor: '#1f7a3a' },
  xpText: { fontFamily: mono, fontWeight: '800', fontSize: 12, color: '#4A3500' },
});
