import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font } from '../theme/tokens';
import { Icon, IconName } from './icons';

/** Top app header — `.ia-head`. Left content (eyebrow/title) + optional round icon button. */
export function Header({
  eyebrow,
  sub,
  title,
  titleSize = 26,
  left,
  right,
  rightIcon,
  onRightPress,
}: {
  eyebrow?: string;
  sub?: string;
  title?: string;
  titleSize?: number;
  left?: ReactNode;
  right?: ReactNode;
  rightIcon?: IconName;
  onRightPress?: () => void;
}) {
  return (
    <View style={styles.head}>
      <View style={styles.left}>
        {left}
        <View style={{ flexShrink: 1 }}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          {sub ? <Text style={styles.sub}>{sub}</Text> : null}
          {title ? <Text style={[styles.title, { fontSize: titleSize }]}>{title}</Text> : null}
        </View>
      </View>
      {right ??
        (rightIcon ? (
          <Pressable style={styles.iconBtn} onPress={onRightPress}>
            <Icon name={rightIcon} size={20} color={colors.ink} />
          </Pressable>
        ) : null)}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 4, paddingBottom: 16 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  eyebrow: { fontFamily: font.extrabold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.9, color: colors.navy },
  sub: { fontFamily: font.semibold, fontSize: 12.5, color: colors.ink2 },
  title: { fontFamily: font.black, color: colors.ink, letterSpacing: -0.5, lineHeight: 30 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.paper, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
});
