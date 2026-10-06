// BODY SCAN: the real camera capability test.
//   1. SCAN  — full body must be detected (no outline, parts grid shows live)
//   2. TEST  — guided moves: right hand, left hand, jumping jacks, with an
//              animated demo figure showing what to do
//   3. READY — the phone passed: live tracking is possible
//   4. TRACK — the real live tracking view (movement bars)
// All detection/counting logic lives in src/camera/activityTest.js.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import PoseCameraWeb from '../components/PoseCameraWeb';
import { normalizeLandmarks } from '../camera/poseAdapter';
import useTPoseCalibration from '../hooks/useTPoseCalibration';
import useLiveTracking from '../hooks/useLiveTracking';
import {
  ACTIVITIES,
  activityDone,
  activityRepCount,
  createCapabilityState,
  measureBodyQuick,
  measureCapabilityMetrics,
  stepCapability,
} from '../camera/activityTest';
import { colors, spacing, fonts, textGlow } from '../theme/theme';
import { GlowPressable, FadeSlideIn } from '../components/fx/SystemFX';

// ---- Animated demo figure: shows the Hunter what movement to do ----------
function Arm({ side, color, rotation }) {
  return (
    <View style={[styles.figArmSlot, side === 'left' ? { left: 36 } : { right: 36 }]}>
      <Animated.View
        style={[
          styles.figArm,
          { backgroundColor: color, transform: [{ rotate: rotation }], transformOrigin: 'top center' },
        ]}
      />
    </View>
  );
}

function DemoFigure({ kind }) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 850, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: 850, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [t]);

  const active = colors.success;
  const idle = '#3a4a63';
  const rightRot =
    kind === 'rightArm' || kind === 'jack'
      ? t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-165deg'] })
      : '0deg';
  const leftRot =
    kind === 'leftArm' || kind === 'jack'
      ? t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '165deg'] })
      : '0deg';
  const jump =
    kind === 'jack'
      ? t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -16, 0] })
      : 0;

  return (
    <Animated.View style={[styles.figure, { transform: [{ translateY: jump }] }]}>
      <View style={styles.figHead} />
      <View style={styles.figTorso} />
      <View style={[styles.figLeg, { left: 52 }]} />
      <View style={[styles.figLeg, { right: 52 }]} />
      <Arm side="left" color={kind === 'leftArm' ? active : idle} rotation={leftRot} />
      <Arm side="right" color={kind === 'rightArm' ? active : idle} rotation={rightRot} />
    </Animated.View>
  );
}

// --------------------------------------------------------------------------
export default function BodyScanScreen({ onBack }) {
  const [raw, setRaw] = useState(null);
  const [size, setSize] = useState({ width: 480, height: 640 });
  const [engineReady, setEngineReady] = useState(false);
  const [webError, setWebError] = useState(null);
  const [facing, setFacing] = useState('user');
  const [phase, setPhase] = useState('scan'); // scan | test | ready | track
  const [profile, setProfile] = useState(null); // frozen at scan completion
  const stateRef = useRef(createCapabilityState());
  const [capView, setCapView] = useState({
    index: 0,
    count: 0,
    target: ACTIVITIES[0].target,
    done: false,
  });

  const aspect = size.width > 0 && size.height > 0 ? size.width / size.height : 480 / 640;

  const landmarks = useMemo(() => (raw ? normalizeLandmarks(raw) : null), [raw]);
  const landmarksRef = useRef(landmarks);
  landmarksRef.current = landmarks;

  // Reuses the validator ONLY for per-part visibility (what the System sees).
  const scan = useTPoseCalibration(landmarks, { aspect });
  const { snapshot } = useLiveTracking(landmarks, {
    aspect,
    profile,
    enabled: phase === 'track',
  });

  const handlePose = (lms, frameSize) => {
    if (frameSize && frameSize.width) {
      setSize(frameSize);
      if (lms === undefined) setEngineReady(true);
    }
    if (lms !== undefined) setRaw(lms);
  };

  // Phase 1 -> 2: whole body visible continuously for 2 s.
  useEffect(() => {
    if (phase !== 'scan') return undefined;
    const parts = scan.parts;
    const allOk = !!parts && Object.values(parts).every((p) => p.ok);
    if (!allOk || !landmarksRef.current) return undefined;
    const id = setTimeout(() => {
      setProfile(measureBodyQuick(landmarksRef.current, aspect));
      stateRef.current = createCapabilityState();
      setCapView({ index: 0, count: 0, target: ACTIVITIES[0].target, done: false });
      setPhase('test');
    }, 2000);
    return () => clearTimeout(id);
  }, [phase, scan.parts, aspect]);

  // Phase 2: count the guided movements at ~8 Hz.
  useEffect(() => {
    if (phase !== 'test') return undefined;
    const id = setInterval(() => {
      const lms = landmarksRef.current;
      if (!lms) return;
      const metrics = measureCapabilityMetrics(lms, aspect);
      stateRef.current = stepCapability(stateRef.current, metrics);
      setCapView({
        index: stateRef.current.index,
        count: activityRepCount(stateRef.current),
        target: ACTIVITIES[stateRef.current.index].target,
        done: activityDone(stateRef.current),
      });
    }, 120);
    return () => clearInterval(id);
  }, [phase, aspect]);

  // Advance to the next activity (or pass) shortly after one completes.
  useEffect(() => {
    if (phase !== 'test' || !capView.done) return undefined;
    const id = setTimeout(() => {
      const next = stateRef.current.index + 1;
      if (next >= ACTIVITIES.length) {
        setPhase('ready');
      } else {
        stateRef.current = { ...stateRef.current, index: next, phase: 'down' };
        setCapView({ index: next, count: 0, target: ACTIVITIES[next].target, done: false });
      }
    }, 1100);
    return () => clearTimeout(id);
  }, [capView.done, capView.index, phase]);

  const activity = ACTIVITIES[capView.index];
  const partsView = phase === 'track' ? (snapshot && snapshot.parts) : scan.parts;
  const allOk = !!partsView && Object.values(partsView).every((p) => p.ok);

  const restart = () => {
    scan.reset();
    stateRef.current = createCapabilityState();
    setCapView({ index: 0, count: 0, target: ACTIVITIES[0].target, done: false });
    setProfile(null);
    setPhase('scan');
  };

  const statusLabel =
    phase === 'scan'
      ? allOk
        ? 'FULL BODY DETECTED'
        : 'SCANNING FOR FULL BODY'
      : phase === 'test'
        ? 'TESTING LIVE TRACKING'
        : phase === 'ready'
          ? 'PASSED'
          : 'LIVE TRACKING';

  const message = webError
    ? 'Engine: ' + webError
    : phase === 'scan'
      ? allOk
        ? 'Full body locked. Hold still...'
        : 'Stand back — the System needs your head, arms, torso, legs and feet in frame.'
      : phase === 'test'
        ? activity.verb
        : phase === 'ready'
          ? 'Your phone can run live tracking, Hunter. The System is impressed.'
          : snapshot
            ? snapshot.message
            : 'Live tracking starting...';

  return (
    <View style={styles.screen}>
      <PoseCameraWeb onPose={handlePose} onError={setWebError} facing={facing} style={StyleSheet.absoluteFill} />

      {/* compact HUD controls (top-left) */}
      <View style={styles.topChips}>
        <Pressable onPress={onBack} hitSlop={8} style={styles.chip}>
          <Text style={styles.chipText}>{'< BACK'}</Text>
        </Pressable>
        <Pressable onPress={restart} hitSlop={8} style={styles.chip}>
          <Text style={styles.chipText}>RESTART</Text>
        </Pressable>
        <Pressable
          onPress={() => setFacing(facing === 'user' ? 'environment' : 'user')}
          hitSlop={8}
          style={styles.chip}
        >
          <Text style={styles.chipText}>{facing === 'user' ? 'BACK CAM' : 'FRONT CAM'}</Text>
        </Pressable>
      </View>

      <FadeSlideIn style={styles.hud}>
        <View style={styles.hudInner}>
          <Text style={styles.title}>{phase === 'test' ? 'CAPABILITY TEST' : 'SYSTEM SCAN'}</Text>
          <Text style={[styles.status, phase === 'ready' && { color: colors.success }]}>{statusLabel}</Text>

          {(phase === 'scan' || phase === 'test') && (
            <View style={styles.barOuter}>
              <View
                style={[
                  styles.barInner,
                  {
                    transform: [
                      {
                        scaleX:
                          phase === 'scan'
                            ? allOk
                              ? 1
                              : 0.15
                            : Math.min(1, capView.count / Math.max(1, capView.target)),
                      },
                    ],
                  },
                ]}
              />
            </View>
          )}

          {phase === 'test' && (
            <Text style={[styles.instruction, textGlow(colors.blueLight)]}>
              {capView.done ? 'GOOD! Hold it...' : activity.verb}
              {'   '}
              <Text style={styles.repCount}>
                {capView.count}/{capView.target}
              </Text>
            </Text>
          )}

          {phase === 'test' && (
            <View style={styles.figurePanel}>
              <DemoFigure kind={activity.demo} />
            </View>
          )}

          {webError && <Text style={styles.errorBanner}>{'> ' + webError}</Text>}

          <Text style={styles.message}>{message}</Text>

          {/* live parts checklist — proof of real-time detection */}
          {partsView && (
            <View style={styles.partsGrid}>
              {Object.entries(partsView).map(([name, p]) => (
                <View key={name} style={[styles.partChip, p.ok && styles.partOk]}>
                  <Text style={[styles.partText, { color: p.ok ? colors.success : colors.danger }]}>
                    {p.ok ? '\u2713 ' : '\u2717 '}
                    {p.label.toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </FadeSlideIn>

      {phase === 'ready' && (
        <FadeSlideIn style={styles.readyWrap}>
          <GlowPressable glowColor={colors.success} onPress={() => setPhase('track')} style={styles.readyButton}>
            <Text style={[styles.buttonText, { color: colors.success }]}>ENTER LIVE TRACKING</Text>
          </GlowPressable>
        </FadeSlideIn>
      )}

      {phase === 'track' && snapshot && (
        <FadeSlideIn style={styles.trackPanel}>
          <View style={styles.moveGrid}>
            {Object.entries(snapshot.movement).map(([name, m]) => (
              <View key={name} style={styles.moveRow}>
                <Text style={[styles.moveLabel, m.active && styles.moveActive]}>{name}</Text>
                <View style={styles.moveBarOuter}>
                  <View
                    style={[
                      styles.moveBarInner,
                      { width: Math.round(Math.min(1, m.speed / 0.4) * 100) + '%' },
                      m.active && { backgroundColor: colors.success },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </FadeSlideIn>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topChips: { position: 'absolute', top: 44, left: spacing.md, zIndex: 5, flexDirection: 'row', gap: 8 },
  chip: {
    backgroundColor: colors.panelTransparent,
    borderColor: '#12203a',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  chipText: { color: colors.blueLight, fontFamily: fonts.heading, fontSize: 10, fontWeight: 'bold' },
  hud: { position: 'absolute', top: 0, left: 0, right: 0 },
  hudInner: {
    padding: spacing.md,
    paddingTop: 76,
    backgroundColor: colors.panelTransparent,
    borderBottomWidth: 1,
    borderBottomColor: '#12203a',
  },
  title: { color: '#ffffff', fontFamily: fonts.heading, fontSize: 13, fontWeight: 'bold', letterSpacing: 3 },
  status: { color: '#ffffff', fontFamily: fonts.display, fontSize: 22, fontWeight: 'bold', marginTop: 4 },
  instruction: { color: '#ffffff', fontFamily: fonts.heading, fontSize: 17, fontWeight: 'bold', marginTop: spacing.sm },
  repCount: { color: colors.blueLight },
  barOuter: { height: 8, backgroundColor: '#0a1630', borderRadius: 4, marginVertical: spacing.sm, overflow: 'hidden' },
  barInner: { height: 8, width: '100%', backgroundColor: colors.blue, borderRadius: 4, transform: [{ scaleX: 0 }] },
  figurePanel: { alignItems: 'center', paddingVertical: spacing.sm },
  message: { color: colors.mutedText, fontFamily: fonts.body, fontSize: 12, marginTop: 6 },
  errorBanner: { color: colors.danger, fontFamily: fonts.heading, fontSize: 11, fontWeight: 'bold', marginTop: 4 },
  partsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: spacing.sm },
  partChip: {
    borderWidth: 1,
    borderColor: '#12203a',
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingVertical: 3,
    paddingHorizontal: 7,
  },
  partOk: { borderColor: colors.success },
  partText: { fontFamily: fonts.heading, fontSize: 9, fontWeight: 'bold', letterSpacing: 1 },
  readyWrap: { position: 'absolute', bottom: 60, left: 0, right: 0, alignItems: 'center' },
  readyButton: {
    borderColor: '#12203a',
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: colors.panel,
    paddingVertical: 16,
    paddingHorizontal: 28,
  },
  buttonText: { fontFamily: fonts.heading, fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
  trackPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    paddingBottom: 28,
    backgroundColor: colors.panelTransparent,
    borderTopWidth: 1,
    borderTopColor: '#12203a',
  },
  moveGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  moveRow: { flexDirection: 'row', alignItems: 'center', width: '48%' },
  moveLabel: { color: colors.mutedText, fontFamily: fonts.heading, fontSize: 10, width: 64 },
  moveActive: { color: colors.success, fontWeight: 'bold' },
  moveBarOuter: { flex: 1, height: 5, backgroundColor: '#0a1630', borderRadius: 3 },
  moveBarInner: { height: 5, backgroundColor: colors.blueLight, borderRadius: 3 },
  // demo figure
  figure: { width: 140, height: 150, alignItems: 'center' },
  figHead: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#dfe9f5', marginTop: 6 },
  figTorso: { width: 8, height: 52, borderRadius: 4, backgroundColor: '#dfe9f5', marginTop: 4 },
  figLeg: { position: 'absolute', top: 92, width: 7, height: 52, borderRadius: 4, backgroundColor: '#8fa3b8' },
  figArmSlot: { position: 'absolute', top: 36, width: 7, height: 46 },
  figArm: { width: 7, height: 46, borderRadius: 4 },
});
