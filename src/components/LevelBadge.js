import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, glow } from '../theme/theme';

export default function LevelBadge({ level, exp, expToNext }) {
  const percent =
    expToNext > 0 ? Math.min(100, Math.round((exp / expToNext) * 100)) : 0;

  return (
    <View style={styles.row}>
      <View style={[styles.avatar, glow(colors.blue)]}>
        <Ionicons name="person" size={24} color={colors.blueLight} />
      </View>

      <View style={styles.info}>
        <Text style={styles.level}>Lv. {level}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${percent}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.blueLight,
    backgroundColor: colors.blueDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { width: 90 },
  level: {
    color: '#ffffff',
    fontFamily: fonts.body,
    fontSize: 14,
    marginBottom: 4,
  },
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: '#0c1a33',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.blue,
  },
});