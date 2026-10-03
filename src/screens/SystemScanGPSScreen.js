// GATE CLEARANCE: DAILY SPRINT — the GPS jogging quest, System-themed.
// Logic (GPS, Haversine, timer, quest decisions) lives in useLocationTracking
// and HunterContext; this screen renders the map and HUD and sends commands.

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import useLocationTracking from '../hooks/useLocationTracking';
import { useHunter } from '../context/HunterContext';
import OsmMap from '../components/OsmMap';
import { colors, spacing, fonts, textGlow } from '../theme/theme';
import { GlowPressable, FadeSlideIn } from '../components/fx/SystemFX';

const MMSS = (sec) =>
  `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

const STATUS_LABEL = {
  IDLE: 'READY',
  'IN PROGRESS': 'IN PROGRESS',
  CLEARED: 'QUEST CLEARED',
  FAILED: 'QUEST FAILED',
};

function GPSTestScreen({ onBack }) {
  const quest = useHunter();
  const [isTracking, setIsTracking] = useState(false);
  const gps = useLocationTracking(isTracking);

  // Feed tracking values into the context (the "back end" decides the result).
  useEffect(() => {
    if (isTracking) quest.updateProgress(gps.distanceKm, gps.elapsedTimeSec);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gps.distanceKm, gps.elapsedTimeSec, isTracking]);

  // Auto-stop the GPS the moment the quest is decided.
  useEffect(() => {
    if (quest.questStatus === 'CLEARED' || quest.questStatus === 'FAILED') setIsTracking(false);
  }, [quest.questStatus]);

  const beginQuest = () => {
    gps.resetTracking();
    quest.startQuest();
    setIsTracking(true);
  };
  const abortQuest = () => {
    quest.abortQuest();
    setIsTracking(false);
  };
  const resetQuest = () => {
    quest.resetQuest();
    setIsTracking(false);
    gps.resetTracking();
  };

  const denied = !gps.permissionGranted && gps.errorMsg;
  const statusLabel = denied ? 'PERMISSION DENIED' : STATUS_LABEL[quest.questStatus];
  const statusColor =
    quest.questStatus === 'CLEARED' ? colors.success : denied ? colors.danger : colors.blueLight;

  return (
    <View style={styles.screen}>
      <OsmMap
        routeCoordinates={gps.routeCoordinates}
        location={gps.location}
        style={StyleSheet.absoluteFill}
      />

      <FadeSlideIn style={styles.hud}>
        <View style={styles.hudInner}>
          <Text style={styles.title}>GATE CLEARANCE</Text>
          <Text style={styles.questName}>{quest.activeQuest || 'NO ACTIVE QUEST'}</Text>
          <Text style={[styles.status, { color: statusColor }]}>{statusLabel}</Text>

          <Text style={styles.goal}>
            {quest.questGoalKm > 0 ? `Goal: ${quest.questGoalKm.toFixed(2)} km` : 'Goal: ---'}
          </Text>
          <Text style={styles.distance}>
            {quest.currentDistanceKm.toFixed(2)}
            <Text style={styles.distanceUnit}> / {quest.questGoalKm > 0 ? quest.questGoalKm.toFixed(2) : '--'} KM</Text>
          </Text>
          <View style={styles.barOuter}>
            <View
              style={[
                styles.barInner,
                {
                  transform: [
                    {
                      scaleX: Math.min(
                        1,
                        quest.questGoalKm > 0 ? quest.currentDistanceKm / quest.questGoalKm : 0
                      ),
                    },
                  ],
                },
              ]}
            />
          </View>
          <View style={styles.statRow}>
            <Text style={styles.stat}>TIME {MMSS(quest.elapsedTimeSec)}</Text>
            <Text style={styles.stat}>SPEED {gps.speedKmH.toFixed(1)} KM/H</Text>
            <Text style={styles.stat}>EXP {quest.exp}</Text>
          </View>
          <Text style={styles.note}>
            {quest.notification || gps.errorMsg || 'The System awaits your command, Hunter.'}
          </Text>
        </View>
      </FadeSlideIn>

      <View style={styles.controls}>
        <GlowPressable glowColor={colors.cyan} disabled={quest.questStatus === 'IN PROGRESS'} onPress={beginQuest} style={[styles.button, styles.flex1]}>
          <Text style={[styles.buttonText, { color: colors.cyan }]}>BEGIN QUEST</Text>
        </GlowPressable>
        <GlowPressable glowColor={colors.danger} disabled={quest.questStatus !== 'IN PROGRESS'} onPress={abortQuest} style={[styles.button, styles.flex1]}>
          <Text style={[styles.buttonText, { color: colors.danger }]}>ABORT</Text>
        </GlowPressable>
        <GlowPressable glowColor={colors.success} disabled={quest.questStatus === 'IN PROGRESS'} onPress={resetQuest} style={[styles.button, styles.flex1]}>
          <Text style={[styles.buttonText, { color: colors.success }]}>RESET</Text>
        </GlowPressable>
        <Pressable onPress={onBack} hitSlop={8} style={styles.back}>
          <Text style={styles.backText}>{'>'}{'<'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// The app shell (App.js) provides the single HunterProvider for the whole app.
export default function SystemScanGPSScreen({ onBack }) {
  return <GPSTestScreen onBack={onBack} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  hud: { position: 'absolute', top: 0, left: 0, right: 0 },
  hudInner: {
    padding: spacing.md,
    paddingTop: 52,
    backgroundColor: colors.panelTransparent,
    borderBottomWidth: 1,
    borderBottomColor: '#12203a',
  },
  title: { color: '#ffffff', fontFamily: fonts.heading, fontSize: 13, fontWeight: 'bold', letterSpacing: 3 },
  questName: { color: colors.blueLight, fontFamily: fonts.body, fontSize: 11, letterSpacing: 1, marginTop: 2 },
  status: { fontFamily: fonts.display, fontSize: 24, fontWeight: 'bold', marginTop: 4 },
  goal: { color: colors.mutedText, fontFamily: fonts.heading, fontSize: 12, letterSpacing: 2, marginTop: spacing.sm },
  distance: { color: '#ffffff', fontFamily: fonts.display, fontSize: 38, fontWeight: 'bold', marginTop: 2 },
  distanceUnit: { color: colors.mutedText, fontSize: 14 },
  barOuter: { height: 8, backgroundColor: '#0a1630', borderRadius: 4, marginVertical: spacing.sm, overflow: 'hidden' },
  barInner: { height: 8, width: '100%', backgroundColor: colors.blue, borderRadius: 4, transform: [{ scaleX: 0 }] },
  statRow: { flexDirection: 'row', gap: spacing.md },
  stat: { color: colors.mutedText, fontFamily: fonts.heading, fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  note: { color: colors.mutedText, fontFamily: fonts.body, fontSize: 11, marginTop: 6, fontStyle: 'italic' },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: 28,
    backgroundColor: colors.panelTransparent,
    borderTopWidth: 1,
    borderTopColor: '#12203a',
  },
  button: { borderColor: '#12203a', borderWidth: 1, borderRadius: 8, backgroundColor: colors.panel, paddingVertical: 12, alignItems: 'center' },
  flex1: { flex: 1 },
  buttonText: { fontFamily: fonts.heading, fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
  back: { borderWidth: 1, borderColor: '#12203a', borderRadius: 8, backgroundColor: colors.panel, paddingVertical: 12, paddingHorizontal: 12 },
  backText: { color: colors.blueLight, fontFamily: fonts.heading, fontSize: 12, fontWeight: 'bold' },
});
