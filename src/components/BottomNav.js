import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, glow } from '../theme/theme';

export default function BottomNav({ tabs, activeTab, onChange }) {
  return (
    <View style={[styles.bar, glow(colors.blue)]}>
      {tabs.map((tab) => {
        const active = tab.key === activeTab;
        return (
          <Pressable
            key={tab.key}
            style={styles.tab}
            onPress={() => onChange && onChange(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={26}
              color={active ? colors.blueLight : colors.mutedText}
            />
            <Text style={[styles.label, active && styles.labelActive]}>
              {tab.label}
            </Text>
            {active ? <View style={styles.underline} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.panelBlue,
    borderWidth: 1,
    borderColor: colors.blue,
    borderRadius: 16,
    paddingVertical: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  label: {
    color: colors.mutedText,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  labelActive: {
    color: colors.blueLight,
    fontWeight: 'bold',
  },
  underline: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.blue,
    marginTop: 2,
  },
});