import React from 'react';
import { View, Text, ImageBackground, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LevelBadge from '../components/LevelBadge';
import ActionButton from '../components/ActionButton';
import BottomNav from '../components/BottomNav';
import QuoteRotator from '../components/QuoteRotator';
import { colors, spacing, fonts, textGlow } from '../theme/theme';

const DEFAULT_TABS = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'inventory', label: 'Inventory', icon: 'briefcase' },
  { key: 'quests', label: 'Quests', icon: 'document-text' },
  { key: 'profile', label: 'Profile', icon: 'person' },
];

function statusColor(status) {
  if (status === 'CLEARED') return colors.success;
  if (status === 'FAILED') return colors.danger;
  if (status === 'IN PROGRESS') return colors.cyan;
  return colors.mutedText;
}

export default function StatusWindow({
  level = 1,
  exp = 30,
  expToNext = 100,
  questStatus = 'IDLE',
  activeQuest = null,
  notification = 'Daily Quest Cleared! EXP Awarded, Hunter.',
  hunterName = 'Hunter',
  backgroundSource = null,
  tabs = DEFAULT_TABS,
  activeTab = 'home',
  onTabChange,
  onStartQuest,
  onOpenSettings,
}) {
  const content = (
    <View style={styles.content}>
      {/* Top row: title + level badge + settings */}
      <View style={styles.topRow}>
        <View>
          <Text style={[styles.title, textGlow(colors.blue)]}>ASCEND</Text>
          <Text style={styles.titleSub}>[ STATUS WINDOW ]</Text>
        </View>

        <View style={styles.topRight}>
          <LevelBadge level={level} exp={exp} expToNext={expToNext} />
          <Pressable onPress={onOpenSettings} hitSlop={10}>
            <Ionicons name="settings-sharp" size={26} color="#ffffff" />
          </Pressable>
        </View>
      </View>

      <View style={styles.spacer} />

      {/* Welcome block */}
      <View>
        <Text style={styles.welcome}>Welcome</Text>
        <Text style={[styles.hunter, textGlow(colors.blue)]}>
          {hunterName}!
        </Text>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <View style={styles.diamond} />
          <View style={styles.dividerLineShort} />
        </View>

        {/* Random quote, fades and changes every 8 seconds */}
        <QuoteRotator style={styles.quote} />

        {/* Quest status + notification */}
        <Text style={styles.statusLine}>
          QUEST STATUS:{' '}
          <Text style={{ color: statusColor(questStatus) }}>{questStatus}</Text>
        </Text>
        {activeQuest ? (
          <Text style={styles.questName}>{activeQuest}</Text>
        ) : null}
        {notification ? (
          <Text style={styles.notification}>{'> ' + notification}</Text>
        ) : null}
      </View>

      {/* Start button */}
      <View style={styles.buttonWrap}>
        <ActionButton
          label="Start Quest"
          icon="sword-cross"
          showArrow
          variant="primary"
          onPress={onStartQuest}
        />
      </View>

      {/* Bottom tab bar */}
      <BottomNav tabs={tabs} activeTab={activeTab} onChange={onTabChange} />
    </View>
  );

  if (backgroundSource) {
    return (
      <ImageBackground
        source={backgroundSource}
        style={styles.screen}
        resizeMode="cover"
      >
        <View style={styles.shade} pointerEvents="none" />
        {content}
      </ImageBackground>
    );
  }

  return <View style={styles.screen}>{content}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  shade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  content: {
    flex: 1,
    paddingTop: 56,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: {
    color: '#ffffff',
    fontFamily: fonts.display,
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  titleSub: {
    color: colors.blueLight,
    fontFamily: fonts.body,
    fontSize: 10,
    letterSpacing: 3,
  },
  spacer: { flex: 1 },
  welcome: {
    color: '#ffffff',
    fontFamily: fonts.display,
    fontSize: 44,
    fontWeight: 'bold',
  },
  hunter: {
    color: colors.blueLight,
    fontFamily: fonts.display,
    fontSize: 52,
    fontWeight: 'bold',
    fontStyle: 'italic',
    marginTop: -6,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.blue,
    opacity: 0.7,
  },
  diamond: {
    width: 10,
    height: 10,
    borderWidth: 1,
    borderColor: colors.blueLight,
    transform: [{ rotate: '45deg' }],
    marginHorizontal: 6,
  },
  dividerLineShort: {
    width: 40,
    height: 1,
    backgroundColor: colors.blue,
    opacity: 0.7,
  },
  quote: {
    maxWidth: '85%',
  },
  statusLine: {
    color: colors.mutedText,
    fontFamily: fonts.heading,
    fontSize: 12,
    letterSpacing: 2,
    marginTop: spacing.md,
  },
  questName: {
    color: '#ffffff',
    fontFamily: fonts.heading,
    fontSize: 14,
    marginTop: 4,
  },
  notification: {
    color: colors.success,
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 6,
  },
  buttonWrap: { marginVertical: spacing.lg },
});