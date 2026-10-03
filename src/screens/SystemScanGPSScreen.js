// TEMPORARY test screen: verifies the GPS quest back end on a real phone.
// The screen ONLY renders what it is given — all GPS math lives in
// useLocationTracking and all quest state lives in HunterContext.
//
//   [BEGIN QUEST]  -> rolls a random goal, starts GPS + timer
//   [ABORT QUEST]  -> quest FAILED, stops tracking
//   [RESET QUEST]  -> back to IDLE, clears the route

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import useLocationTracking from '../hooks/useLocationTracking';
import { useHunter } from '../context/HunterContext';
import OsmMap from '../components/OsmMap';
const CYAN = '#4de8ff';
const GREEN = '#7dff9b';
const RED = '#ff5c7a';
const PURPLE = '#a855f7';
const INK = '#a9b8d0';
const PANEL = 'rgba(5,8,15,0.75)';

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

  // Auto-stop the GPS the moment the quest is cleared.
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
  const statusColor = quest.questStatus === 'CLEARED' ? GREEN : denied ? RED : CYAN;

  return (
    <View style={styles.screen}>
      <OsmMap
        routeCoordinates={gps.routeCoordinates}
        location={gps.location}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.hud}>
        <Text style={styles.title}>SYSTEM SCAN: {quest.activeQuest || 'NO ACTIVE QUEST'}</Text>
        <Text style={[styles.status, { color: statusColor }]}>{statusLabel}</Text>
        <Text style={styles.goal}>
          {quest.questGoalKm > 0 ? `Goal: ${quest.questGoalKm.toFixed(2)} km` : 'Goal: ---'}
        </Text>
        <Text style={styles.stats}>
          {quest.currentDistanceKm.toFixed(2)} /{' '}
          {quest.questGoalKm > 0 ? quest.questGoalKm.toFixed(2) : '--'} km
        </Text>
        <View style={styles.barOuter}>
          <View
            style={[
              styles.barInner,
              {
                width: `${Math.min(
                  100,
                  quest.questGoalKm > 0 ? (quest.currentDistanceKm / quest.questGoalKm) * 100 : 0
                )}%`,
              },
            ]}
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.stat}>TIME {MMSS(quest.elapsedTimeSec)}</Text>
          <Text style={styles.stat}>SPEED {gps.speedKmH.toFixed(1)} km/h</Text>
          <Text style={styles.stat}>EXP {quest.exp}</Text>
        </View>
        <Text style={styles.note}>{quest.notification || gps.errorMsg || 'The System awaits your command, Hunter.'}</Text>
      </View>

      <View style={styles.controls}>
        <Pressable
          style={[styles.button, quest.questStatus === 'IN PROGRESS' && styles.buttonDisabled]}
          disabled={quest.questStatus === 'IN PROGRESS'}
          onPress={beginQuest}
        >
          <Text style={styles.buttonText}>BEGIN QUEST</Text>
        </Pressable>
        <Pressable
          style={[styles.button, quest.questStatus !== 'IN PROGRESS' && styles.buttonDisabled]}
          disabled={quest.questStatus !== 'IN PROGRESS'}
          onPress={abortQuest}
        >
          <Text style={styles.buttonText}>ABORT QUEST</Text>
        </Pressable>
        <Pressable
          style={[styles.button, quest.questStatus === 'IN PROGRESS' && styles.buttonDisabled]}
          disabled={quest.questStatus === 'IN PROGRESS'}
          onPress={resetQuest}
        >
          <Text style={styles.buttonText}>RESET QUEST</Text>
        </Pressable>
        {onBack && (
          <Pressable style={styles.button} onPress={onBack}>
            <Text style={styles.buttonText}>Back</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// The app shell (App.js) provides the single HunterProvider for the whole app.
export default function SystemScanGPSScreen({ onBack }) {
  return <GPSTestScreen onBack={onBack} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#05080f' },
  hud: {
    position: 'absolute', top: 0, left: 0, right: 0,
    padding: 16, paddingTop: 48, backgroundColor: PANEL,
  },
  title: { color: CYAN, fontSize: 13, fontWeight: 'bold', letterSpacing: 1 },
  status: { fontSize: 22, fontWeight: 'bold', marginTop: 2 },
  goal: { color: PURPLE, marginTop: 4, fontSize: 14 },
  stats: { color: '#fff', fontSize: 34, fontWeight: 'bold', marginTop: 2 },
  barOuter: { height: 8, backgroundColor: '#12203a', borderRadius: 4, marginVertical: 8 },
  barInner: { height: 8, backgroundColor: CYAN, borderRadius: 4 },
  row: { flexDirection: 'row', gap: 16 },
  stat: { color: INK, fontSize: 13, fontWeight: 'bold' },
  note: { color: INK, fontSize: 12, marginTop: 6, fontStyle: 'italic' },
  controls: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 12, paddingBottom: 28, backgroundColor: PANEL,
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  button: { borderColor: CYAN, borderWidth: 1, borderRadius: 6, paddingVertical: 10, paddingHorizontal: 14 },
  buttonDisabled: { borderColor: '#233', opacity: 0.4 },
  buttonText: { color: CYAN, fontSize: 13, fontWeight: 'bold' },
});
