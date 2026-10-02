// TEMPORARY screen: the full live-tracking flow.
//   1. SYSTEM SCAN   fit the T-pose outline (locks the Hunter's body size)
//   2. MOTION SCAN   move head / arms / torso / legs (locks range of motion)
//   3. LIVE TRACKING the System follows the Hunter in real time
//
// Real body detection needs a development build and a pose library (not Expo
// Go). Until then the buttons at the bottom SIMULATE the Hunter moving; the
// camera preview, skeleton and tracking panels are real.

import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Svg, { Circle, Line } from 'react-native-svg';
import useTPoseCalibration from '../hooks/useTPoseCalibration';
import useMotionCalibration from '../hooks/useMotionCalibration';
import useLiveTracking from '../hooks/useLiveTracking';
import { KEY_JOINTS, SKELETON_CONNECTIONS } from '../camera/landmarks';
import { makeTPose, withArmsDown } from '../camera/mockPose';
import {
  armRaise, freeMove, headScan, kneeLift, restPose, torsoLean, withHiddenPart,
} from '../camera/mockMotion';

const CYAN = '#4de8ff';
const GREEN = '#7dff9b';
const RED = '#ff5c7a';
const PURPLE = '#a855f7';
const INK = '#a9b8d0';

const PHASE = { POSE: 'POSE', SCAN: 'SCAN', LIVE: 'LIVE' };
const PHASE_TITLE = { POSE: 'SYSTEM SCAN: T-POSE', SCAN: 'MOTION SCAN', LIVE: 'LIVE TRACKING' };

// (aspect, t) -> landmarks, one entry per simulation button
const SIM = {
  POSE: {
    none: { label: 'No detection', make: () => null },
    tpose: { label: 'Perfect T-pose', make: (a) => makeTPose(a) },
    armsDown: { label: 'Arms down', make: (a) => withArmsDown(makeTPose(a), a) },
  },
  SCAN: {
    still: { label: 'Stand still', make: (a, t) => restPose(a, t) },
    head: { label: 'Move head', make: (a, t) => headScan(a, t) },
    armL: { label: 'Left arm', make: (a, t) => armRaise(a, t, 'left') },
    armR: { label: 'Right arm', make: (a, t) => armRaise(a, t, 'right') },
    lean: { label: 'Lean', make: (a, t) => torsoLean(a, t) },
    knees: { label: 'Knee lifts', make: (a, t) => kneeLift(a, t) },
  },
  LIVE: {
    rest: { label: 'Stand still', make: (a, t) => restPose(a, t) },
    free: { label: 'Move freely', make: (a, t) => freeMove(a, t) },
    hideHand: { label: 'Hand hidden', make: (a, t) => withHiddenPart(a, t) },
    leave: { label: 'Leave frame', make: () => null },
  },
};

export default function LiveTrackScreen({ onBack }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [phase, setPhase] = useState(PHASE.POSE);
  const [mode, setMode] = useState('none');
  const [t, setT] = useState(0);
  const [bodyProfile, setBodyProfile] = useState(null);

  const aspect = size.width > 0 && size.height > 0 ? size.width / size.height : 9 / 16;

  // Animates the fake Hunter: t loops 0..1 and the generators move with it.
  useEffect(() => {
    const id = setInterval(() => setT((v) => (v + 0.06) % 1), 80);
    return () => clearInterval(id);
  }, []);

  const landmarks = useMemo(() => {
    const sim = SIM[phase][mode];
    return sim ? sim.make(aspect, t) : null;
  }, [phase, mode, aspect, t]);

  const scan = useTPoseCalibration(landmarks, { aspect });
  const motion = useMotionCalibration(landmarks, { aspect, calibration: bodyProfile });
  const { snapshot: track } = useLiveTracking(landmarks, { aspect, profile: bodyProfile });

  if (!permission) return <View style={styles.screen} />;

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>The System needs camera access to track you, Hunter.</Text>
        <Pressable style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Allow camera</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={onBack}>
          <Text style={styles.buttonText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const W = size.width;
  const H = size.height;
  const simModes = SIM[phase];

  const beginMotionScan = () => {
    setBodyProfile(scan.calibration);
    motion.reset();
    setMode('still');
    setPhase(PHASE.SCAN);
  };
  const enterLiveTracking = () => {
    setMode('rest');
    setPhase(PHASE.LIVE);
  };
  const restartAll = () => {
    scan.reset();
    motion.reset();
    setBodyProfile(null);
    setMode('none');
    setPhase(PHASE.POSE);
  };

  // The joints the UI draws: raw landmarks while scanning, smoothed ones live.
  const joints = phase === PHASE.LIVE ? (track && track.joints) : landmarks;

  return (
    <View style={styles.screen} onLayout={(e) => setSize(e.nativeEvent.layout)}>
      <CameraView style={StyleSheet.absoluteFill} facing="front" />

      {W > 0 && phase === PHASE.POSE && scan.template && (
        <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
          {scan.template.connections.map(([a, b]) => (
            <Line
              key={`o-${a}-${b}`}
              x1={scan.template.points[a].x * W}
              y1={scan.template.points[a].y * H}
              x2={scan.template.points[b].x * W}
              y2={scan.template.points[b].y * H}
              stroke={scan.ready ? GREEN : CYAN}
              strokeWidth={3}
              strokeOpacity={0.85}
            />
          ))}
        </Svg>
      )}

      {W > 0 && joints && (
        <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
          {SKELETON_CONNECTIONS.map(([a, b]) => (
            <Line
              key={`s-${a}-${b}`}
              x1={joints[a].x * W}
              y1={joints[a].y * H}
              x2={joints[b].x * W}
              y2={joints[b].y * H}
              stroke={PURPLE}
              strokeWidth={2}
            />
          ))}
          {KEY_JOINTS.map((i) => (
            <Circle
              key={`j-${i}`}
              cx={joints[i].x * W}
              cy={joints[i].y * H}
              r={6}
              fill={joints[i].visibility >= 0.5 ? GREEN : RED}
            />
          ))}
        </Svg>
      )}

      <View style={styles.top}>
        <Text style={styles.title}>{PHASE_TITLE[phase]}</Text>

        {phase === PHASE.POSE && (
          <>
            <Text style={styles.status}>{scan.status}</Text>
            <View style={styles.barOuter}>
              <View style={[styles.barInner, { width: `${Math.round(scan.progress * 100)}%` }]} />
            </View>
          </>
        )}

        {phase === PHASE.SCAN && (
          <>
            <Text style={styles.status}>
              {motion.step ? `${motion.step.label} scan` : ''} — {motion.status}
            </Text>
            <View style={styles.barOuter}>
              <View style={[styles.barInner, { width: `${Math.round((motion.totalProgress || 0) * 100)}%` }]} />
            </View>
            <View style={styles.row}>
              {motion.steps.map((s, i) => (
                <Text key={s.id} style={[styles.stepChip, i < motion.stepIndex && styles.stepDone]}>
                  {i < motion.stepIndex ? '✓' : i === motion.stepIndex ? '●' : '○'} {s.label}
                </Text>
              ))}
            </View>
          </>
        )}

        {phase === PHASE.LIVE && track && (
          <>
            <Text style={[styles.status, track.status !== 'TRACKING' && { color: RED }]}>
              {track.status}
            </Text>
            <View style={styles.row}>
              {Object.entries(track.movement).map(([name, m]) => (
                <View key={name} style={styles.moveRow}>
                  <Text style={[styles.moveLabel, m.active && styles.moveActive]}>{name}</Text>
                  <View style={styles.moveBarOuter}>
                    <View
                      style={[
                        styles.moveBarInner,
                        { width: `${Math.round(Math.min(1, m.speed / 0.4) * 100)}%` },
                        m.active && { backgroundColor: GREEN },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={styles.message}>
          {phase === PHASE.POSE ? scan.message : phase === PHASE.SCAN ? motion.message : track && track.message}
        </Text>
      </View>

      <View style={styles.bottom}>
        {phase === PHASE.POSE && scan.ready && (
          <Pressable style={[styles.button, styles.primary]} onPress={beginMotionScan}>
            <Text style={styles.buttonText}>BEGIN MOTION SCAN</Text>
          </Pressable>
        )}
        {phase === PHASE.SCAN && motion.status === 'COMPLETE' && (
          <Pressable style={[styles.button, styles.primary]} onPress={enterLiveTracking}>
            <Text style={styles.buttonText}>ENTER LIVE TRACKING</Text>
          </Pressable>
        )}
        {phase === PHASE.LIVE && (
          <Pressable style={[styles.button, styles.primary]} onPress={restartAll}>
            <Text style={styles.buttonText}>END TRACKING</Text>
          </Pressable>
        )}

        <Text style={styles.note}>
          Live body detection needs a development build. Tap a button to simulate the Hunter moving.
        </Text>
        <View style={styles.row}>
          {Object.entries(simModes).map(([key, m]) => (
            <Pressable
              key={key}
              style={[styles.chip, key === mode && styles.chipActive]}
              onPress={() => {
                if (phase === PHASE.POSE) scan.reset();
                if (phase === PHASE.SCAN) motion.reset();
                setMode(key);
              }}
            >
              <Text style={styles.chipText}>{m.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.row}>
          <Pressable style={styles.button} onPress={restartAll}>
            <Text style={styles.buttonText}>Restart</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={onBack}>
            <Text style={styles.buttonText}>Back</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, backgroundColor: '#05080f', justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, padding: 16, paddingTop: 48, backgroundColor: 'rgba(5,8,15,0.7)' },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, paddingBottom: 28, backgroundColor: 'rgba(5,8,15,0.7)', gap: 8 },
  title: { color: CYAN, fontSize: 14, fontWeight: 'bold', letterSpacing: 2 },
  status: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 2 },
  barOuter: { height: 8, backgroundColor: '#12203a', borderRadius: 4, marginVertical: 8 },
  barInner: { height: 8, backgroundColor: GREEN, borderRadius: 4 },
  message: { color: '#fff', fontSize: 15, marginTop: 6 },
  stepChip: { color: INK, fontSize: 12, marginRight: 10 },
  stepDone: { color: GREEN },
  moveRow: { flexDirection: 'row', alignItems: 'center', width: '48%', marginBottom: 3 },
  moveLabel: { color: INK, fontSize: 10, width: 70 },
  moveActive: { color: GREEN, fontWeight: 'bold' },
  moveBarOuter: { flex: 1, height: 5, backgroundColor: '#12203a', borderRadius: 3 },
  moveBarInner: { height: 5, backgroundColor: PURPLE, borderRadius: 3 },
  note: { color: INK, fontSize: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderColor: CYAN, borderWidth: 1, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12 },
  chipActive: { backgroundColor: '#0b3a4a' },
  chipText: { color: CYAN, fontSize: 13 },
  button: { borderColor: CYAN, borderWidth: 1, borderRadius: 6, paddingVertical: 10, paddingHorizontal: 18, alignSelf: 'flex-start' },
  primary: { borderColor: GREEN },
  buttonText: { color: CYAN, fontSize: 14 },
});
