import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, glow } from '../theme/theme';

const VARIANTS = {
  primary: {
    border: colors.blueLight,
    bg: colors.blueDeep,
    text: '#ffffff',
    glow: colors.blue,
  },
  danger: {
    border: colors.danger,
    bg: '#2a0d18',
    text: colors.danger,
    glow: colors.danger,
  },
  default: {
    border: colors.cyan,
    bg: colors.panel,
    text: colors.cyan,
    glow: colors.cyan,
  },
};

export default function ActionButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  icon,
  showArrow = false,
}) {
  const v = VARIANTS[variant] || VARIANTS.primary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: v.bg, borderColor: v.border },
        glow(v.glow),
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {icon ? (
        <MaterialCommunityIcons name={icon} size={30} color={v.text} />
      ) : null}
      {icon ? (
        <View style={[styles.divider, { backgroundColor: v.border }]} />
      ) : null}
      <Text style={[styles.label, { color: v.text }]}>
        {String(label).toUpperCase()}
      </Text>
      {showArrow ? (
        <MaterialCommunityIcons
          name="chevron-right"
          size={28}
          color={v.border}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderRadius: 14,
    gap: 12,
  },
  divider: {
    width: 1,
    height: 28,
    opacity: 0.6,
  },
  label: {
    fontFamily: fonts.display,
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.4 },
});