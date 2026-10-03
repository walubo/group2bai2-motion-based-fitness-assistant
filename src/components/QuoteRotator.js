import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { colors, fonts, textGlow } from '../theme/theme';

const DEFAULT_QUOTES = [
  'The journey may be tough, but your growth never stops.',
  'Every step forward makes you stronger.',
  'No one can grind your levels for you.',
  'Start weak. End unstoppable.',
  'Every failure is another lesson.',
  'Your next level is waiting.',
  'The harder the quest, the greater the reward.',
  'Keep moving. Keep growing.',
  'Strength is earned, not given.',
  'Every battle brings experience.',
  'Your limits are meant to be challenged.',
  'Fall, learn, rise again.',
  'A new quest. A new opportunity.',
];

// Pick a random index that is different from the previous one
function pickRandomIndex(length, previousIndex) {
  if (length <= 1) return 0;
  let next = Math.floor(Math.random() * length);
  while (next === previousIndex) {
    next = Math.floor(Math.random() * length);
  }
  return next;
}

export default function QuoteRotator({
  quotes = DEFAULT_QUOTES,
  intervalMs = 8000, // time between quote changes
  fadeMs = 1500, // how slowly it fades
  style,
}) {
  const [index, setIndex] = useState(() =>
    pickRandomIndex(quotes.length, -1)
  );
  const indexRef = useRef(index);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;

    // Fade the first quote in
    Animated.timing(opacity, {
      toValue: 1,
      duration: fadeMs,
      useNativeDriver: true,
    }).start();

    // Every 8 seconds: fade out -> change quote -> fade in
    const timer = setInterval(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: fadeMs,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || cancelled) return;

        const next = pickRandomIndex(quotes.length, indexRef.current);
        indexRef.current = next;
        setIndex(next);

        Animated.timing(opacity, {
          toValue: 1,
          duration: fadeMs,
          useNativeDriver: true,
        }).start();
      });
    }, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(timer);
      opacity.stopAnimation();
    };
  }, [quotes.length, intervalMs, fadeMs, opacity]);

  return (
    <Animated.Text style={[styles.quote, style, { opacity }]}>
      {'\u201C'}
      {quotes[index]}
      {'\u201D'}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  quote: {
    color: colors.blueLight,
    fontFamily: fonts.display,
    fontStyle: 'italic',
    fontSize: 16,
    lineHeight: 24,
    minHeight: 72, // keeps the layout from jumping between quotes
    ...textGlow(colors.blue),
  },
});