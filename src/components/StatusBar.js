import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fonts, glow } from '../theme/theme';

export default function StatusBar({ level, exp, expToNext }) {
  const percent = Math.min(100, Math.round((exp / expToNext) * 100));

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.level}>LV. {level}</Text>
        <Text style={styles.expText}>
          {exp} / {expToNext} EXP
        </Text>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>

      <Text style={styles.percent}>{percent}% TO NEXT LEVEL</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
  },
  level: {
    color: colors.cyan,
    fontFamily: fonts.heading,
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  expText: {
    color: colors.mutedText,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  track: {
    height: 14,
    borderRadius: 7,
    backgroundColor: '#13203a',
    borderWidth: 1,
    borderColor: colors.cyan,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.cyan,
    ...glow(colors.cyan),
  },
  percent: {
    color: colors.mutedText,
    fontFamily: fonts.body,
    fontSize: 11,
    marginTop: spacing.xs,
    letterSpacing: 1,
  },
});