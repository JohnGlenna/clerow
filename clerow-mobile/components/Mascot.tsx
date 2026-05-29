import { useEffect, useRef } from 'react';
import { Animated, Image, ImageStyle, StyleProp } from 'react-native';

const SRC = require('../assets/clerow-mascot.png');

type Props = {
  size?: number;
  /** Gentle up/down hover, matching the CSS `clerow-float` keyframes. */
  float?: boolean;
  style?: StyleProp<ImageStyle>;
};

/** The Clerow owl mascot (uploaded PNG, used throughout the iOS design). */
export function Mascot({ size = 120, float = false, style }: Props) {
  const y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!float) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: -8, duration: 2000, useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [float, y]);

  return (
    <Animated.Image
      source={SRC}
      // typed loosely because Animated.Image accepts the transform array
      style={[{ width: size, height: size, resizeMode: 'contain' }, { transform: [{ translateY: y }] }, style as object]}
    />
  );
}

/** Non-animated convenience (e.g. inside lists) to avoid extra Animated nodes. */
export function MascotStatic({ size = 120, style }: { size?: number; style?: StyleProp<ImageStyle> }) {
  return <Image source={SRC} style={[{ width: size, height: size, resizeMode: 'contain' }, style]} />;
}
