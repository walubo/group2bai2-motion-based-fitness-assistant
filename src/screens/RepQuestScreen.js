// SHADOW EXTRACTION (push-up quest): brand-new UI for the rep counter.
// Logic comes from the tested hooks (useAccelerometer + useRepCounter) and
// EXP/level state from HunterContext — this screen only displays and commands.

import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import useAccelerometer from '../hooks/useAccelerometer';
import useRepCounter from '../hooks/useRepCounter';
import { useHunter } from '../context/HunterContext';
import { colors, spacing, fonts, textGlow, glow } from '../theme/theme';
import { GlowPressable, FadeSlideIn, PulsingGlow } from '../components/fx/SystemFX';

const GOAL_REPS = 20;

export default function RepQuestScreen({ onBack }) {
  const quest = useHunter();
  const [isTracking, setIsTracking] = useState(false);
  const { magnitude, available } = useAccelerometer(isTracking);
  const { reps, reset } = useRepCounter(magnitude, isTracking);

  const beginQuest = () => {
    quest.setQuestStatus('IN PROGRESS');
    setIsTracking(true);
  };
  const completeQuest = () => {
    quest.awardExp(reps);
    quest.setQuestStatus('CLEARED');
    setIsTracking(false);
    reset();
  };
  const abortQuest = () => {
    quest.setQuestStatus('FAILED');
    setIsTracking(false);
    reset();
  };
  const resetQuest = () => {
    quest.setQuestStatus('IDLE');
    setIsTracking(false);
    reset();
  };

  const progress = Math.min(1, reps / GOAL_REPS);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <FadeSlideIn>
          <View style={styles.header}>
            <Text style={[styles.title, textGlow(colors.blue)]}>SHADOW EXTRACTION</Text>
            <Text style={styles.subtitle}>{'> PUSH-UP PROTOCOL'}</Text>
          </View>
        </FadeSlideIn>

        {/* The rep counter */}
        <FadeSlideIn delay={90}>
          <View style={[styles.counterPanel, glow(isTracking ? colors.blue : colors.mutedText)]}>
            <PulsingGlow color={isTracking ? colors.blueLight : colors.mutedText} borderRadius={80} durationMs={isTracking ? 900 : 2000} style={styles.ringWrap}>
              <View style={styles.ring}>
                <Text style={[styles.repNumber, isTracking && textGlow(colors.blueLight)]}>{reps}</Text>
                <Text style={styles.repLabel}>REPS</Text>
              </View>
            </PulsingGlow>

            <Text style={styles.live}>
              MOTION <Text style={styles.liveValue}>{magnitude.toFixed(2)} g</Text>
              {!available ? '  (sensor unavailable)' : ''}
            </Text>
          </View>
        </FadeSlideIn>

        {/* Goal progress */}
        <FadeSlideIn delay={160}>
          <View style={styles.goalPanel}>
            <View style={styles.goalRow}>
              <Text style={styles.goalLabel}>GOAL {GOAL_REPS} REPS</Text>
              <Text style={styles.expText}>+{reps * 10} EXP</Text>
            </View>
            <View style={styles.barOuter}>
              <View style={[styles.barInner, { transform: [{ scaleX: progress }] }]} />
            </View>
            <Text style={styles.hint}>
              {isTracking
                ? 'Phone on your back, Hunter. Down and up counts one rep.'
                : 'Press BEGIN QUEST, place the phone on your back, then extract.'}
            </Text>
          </View>
        </FadeSlideIn>

        {/* Commands */}
        <FadeSlideIn delay={230} style={styles.buttonRow}>
          <GlowPressable glowColor={colors.cyan} disabled={isTracking} onPress={beginQuest} style={[styles.button, styles.flex1]}>
            <Text style={[styles.buttonText, { color: colors.cyan }]}>BEGIN QUEST</Text>
          </GlowPressable>
          <GlowPressable glowColor={colors.success} disabled={!isTracking || reps === 0} onPress={completeQuest} style={[styles.button, styles.flex1]}>
            <Text style={[styles.buttonText, { color: colors.success }]}>COMPLETE</Text>
          </GlowPressable>
        </FadeSlideIn>
        <FadeSlideIn delay={280} style={styles.buttonRow}>
          <GlowPressable glowColor={colors.danger} disabled={!isTracking} onPress={abortQuest} style={[styles.button, styles.flex1]}>
            <Text style={[styles.buttonText, { color: colors.danger }]}>ABORT</Text>
          </GlowPressable>
          <GlowPressable glowColor={colors.mutedText} disabled={isTracking} onPress={resetQuest} style={[styles.button, styles.flex1]}>
            <Text style={[styles.buttonText, { color: colors.mutedText }]}>RESET</Text>
          </GlowPressable>
        </FadeSlideIn>

        <FadeSlideIn delay={330} style={styles.footer}>
          <GlowPressable glowColor={colors.mutedText} onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>{'< QUEST BOARD'}</Text>
          </GlowPressable>
        </FadeSlideIn>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, padding: spacing.lg, paddingTop: 56, gap: spacing.md },
  header: { marginBottom: spacing.xs },
  title: { color: '#ffffff', fontFamily: fonts.display, fontSize: 26, fontWeight: 'bold', letterSpacing: 3 },
  subtitle: { color: colors.blueLight, fontFamily: fonts.body, fontSize: 11, letterSpacing: 2, marginTop: 2 },
  counterPanel: {
    alignItems: 'center',
    backgroundColor: colors.panelBlue,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#12203a',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  ringWrap: { borderRadius: 80 },
  ring: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blueDeep,
  },
  repNumber: { color: '#ffffff', fontFamily: fonts.display, fontSize: 64, fontWeight: 'bold' },
  repLabel: { color: colors.blueLight, fontFamily: fonts.heading, fontSize: 12, letterSpacing: 4 },
  live: { color: colors.mutedText, fontFamily: fonts.heading, fontSize: 12, letterSpacing: 1, marginTop: spacing.md },
  liveValue: { color: colors.blueLight, fontWeight: 'bold' },
  goalPanel: {
    backgroundColor: colors.panelBlue,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#12203a',
    padding: spacing.md,
  },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  goalLabel: { color: colors.mutedText, fontFamily: fonts.heading, fontSize: 12, letterSpacing: 2 },
  expText: { color: colors.success, fontFamily: fonts.heading, fontSize: 12, fontWeight: 'bold' },
  barOuter: { height: 10, backgroundColor: '#0a1630', borderRadius: 5, overflow: 'hidden' },
  barInner: { height: 10, width: '100%', backgroundColor: colors.blue, borderRadius: 5, transform: [{ scaleX: 0 }] },
  hint: { color: colors.mutedText, fontFamily: fonts.body, fontSize: 12, marginTop: spacing.sm, fontStyle: 'italic' },
  buttonRow: { flexDirection: 'row', gap: spacing.sm },
  button: {
    borderColor: '#12203a',
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: colors.panel,
    paddingVertical: 14,
    alignItems: 'center',
  },
  flex1: { flex: 1 },
  buttonText: { fontFamily: fonts.heading, fontSize: 13, fontWeight: 'bold', letterSpacing: 1 },
  footer: { alignItems: 'flex-start', paddingBottom: spacing.xl },
  backButton: { borderColor: colors.mutedText, borderWidth: 1, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 },
  backText: { color: colors.mutedText, fontFamily: fonts.heading, fontSize: 13, fontWeight: 'bold' },
});
