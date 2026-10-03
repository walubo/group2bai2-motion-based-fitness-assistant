// Reusable UI-FX kit (pure display, layer 4). Gives every touchable the
// "System panel" feel: glow ignites + slight press-down on touch/hover,
// spring back on release, pulsing glows and smooth entrances.
//
// Fast by design: every animation uses the native driver (runs on the UI
// thread, never blocked by JavaScript), so it stays smooth on cheap phones.
//
//   <GlowPressable onPress={...} glowColor="#4de8ff">...</GlowPressable>
//   <PulsingGlow color="#a855f7">...</PulsingGlow>
//   <FadeSlideIn delay={100}>...</FadeSlideIn>

import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

// A Pressable with a glowing border halo and a subtle press-down scale.
// The glow fires on press (finger/mouse down) and on hover (web/mouse).
export function GlowPressable({
  onPress,
  disabled = false,
  glowColor = '#4de8ff',
  glowRadius = 14,
  borderRadius = 10,
  style,
  children,
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;

  const activate = () => {
    if (disabled) return;
    Animated.parallel([
      Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 40, bounciness: 5 }),
      Animated.timing(glow, { toValue: 1, duration: 110, useNativeDriver: true }),
    ]).start();
  };
  const release = () => {
    if (disabled) return;
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 26, bounciness: 6 }),
      Animated.timing(glow, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={activate}
      onPressOut={release}
      onHoverIn={activate}
      onHoverOut={release}
    >
      <Animated.View style={[style, { transform: [{ scale }], opacity: disabled ? 0.45 : 1 }]}>
        {children}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glowLayer,
            { borderRadius, borderColor: glowColor, shadowColor: glowColor, shadowRadius: glowRadius, opacity: glow },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

// Wraps children with a soft breathing glow (e.g. level badges, alerts).
export function PulsingGlow({
  children,
  color = '#a855f7',
  borderRadius = 12,
  minOpacity = 0.25,
  maxOpacity = 0.9,
  durationMs = 1200,
  style,
}) {
  const glow = useRef(new Animated.Value(minOpacity)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: maxOpacity, duration: durationMs / 2, useNativeDriver: true }),
        Animated.timing(glow, { toValue: minOpacity, duration: durationMs / 2, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [glow, durationMs, minOpacity, maxOpacity]);

  return (
    <View style={style}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glowLayer,
          { borderRadius, borderColor: color, shadowColor: color, shadowOpacity: 1, shadowRadius: 12, opacity: glow },
        ]}
      />
    </View>
  );
}

// Entrance animation: fades in and slides up once on mount.
// Use different `delay` values on siblings for a stagger effect.
export function FadeSlideIn({ children, delay = 0, distance = 16, style }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(distance)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, delay, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY, delay]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glowLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1.5,
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
});
