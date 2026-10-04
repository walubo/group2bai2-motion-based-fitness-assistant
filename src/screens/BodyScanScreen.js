// BODY SCAN: REAL camera body tracking — the genuine article.
// Phase 1 (SYSTEM SCAN): the Hunter fits the T-pose outline drawn over the
//   live camera; MediaPipe analyses real frames and useTPoseCalibration locks
//   the body profile.
// Phase 2 (LIVE TRACKING): useLiveTracking follows the real skeleton with
//   thresholds from that personal profile.
//
// A small simulation fallback exists in case the camera/CDN is unavailable,
// clearly labelled — the default path is the real detector.

import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import PoseCameraWeb from '../components/PoseCameraWeb';
import { normalizeLandmarks } from '../camera/poseAdapter';
import { buildTemplate } from '../camera/tposeTemplate';
import { makeTPose, withArmsDown } from '../camera/mockPose';
import useTPoseCalibration from '../hooks/useTPoseCalibration';
import useLiveTracking from '../hooks/useLiveTracking';
import { colors, spacing, fonts, textGlow } from '../theme/theme';
import { GlowPressable, FadeSlideIn } from '../components/fx/SystemFX';

const SIM_POSES = {
  perfect: (a) => makeTPose(a),
  armsDown: (a) => withArmsDown(makeTPose(a), a),
};

export default function BodyScanScreen({ onBack }) {
  const [raw, setRaw] = useState(null); // latest landmark array from the engine
  const [size, setSize] = useState({ width: 480, height: 640 });
  const [engineReady, setEngineReady] = useState(false);
  const [webError, setWebError] = useState(null);
  const [phase, setPhase] = useState('scan'); // 'scan' | 'track'
  const [sim, setSim] = useState(null); // null = real camera, else sim key

  const aspect = size.width > 0 && size.height > 0 ? size.width / size.height : 480 / 640;

  // If the engine never reports ready, surface it instead of a black screen.
  useEffect(() => {
    if (sim || engineReady) return undefined;
    const id = setTimeout(() => {
      setWebError((e) => e || 'Engine did not start in 25 s — check internet, then reload.');
    }, 25000);
    return () => clearTimeout(id);
  }, [sim, engineReady]);

  // WebView messages can arrive faster than renders — normalize on the way in.
  const landmarks = useMemo(() => {
    if (sim) return normalizeLandmarks(SIM_POSES[sim](aspect));
    if (!raw) return null;
    return normalizeLandmarks(raw);
  }, [raw, sim, aspect]);

  const scan = useTPoseCalibration(landmarks, { aspect });
  const { snapshot } = useLiveTracking(landmarks, {
    aspect,
    profile: scan.calibration,
    enabled: phase === 'track',
  });

  // The T-pose outline is computed here (one template for this frame size)
  // and drawn by the WebView right on top of the live video.
  const outline = useMemo(() => {
    const tpl = buildTemplate(aspect);
    return {
      points: tpl.points,
      connections: tpl.connections,
      head: tpl.head,
      visible: phase === 'scan' && !sim,
    };
  }, [aspect, phase, sim]);

  const handlePose = (lms, frameSize) => {
    if (frameSize && frameSize.width) {
      setSize(frameSize);
      if (lms === undefined) setEngineReady(true); // engine-ready ping
    }
    if (lms !== undefined) {
      setEngineReady(true);
      setRaw(lms); // null = no pose visible, array = real landmarks
    }
  };

  const enterTracking = () => {
    setWebError(null);
    setPhase('track');
  };
  const restartScan = () => {
    scan.reset();
    setPhase('scan');
  };

  const statusLine =
    phase === 'track'
      ? snapshot
        ? snapshot.status
        : 'LIVE TRACKING'
      : scan.status;

  const message =
    webError && !sim
      ? 'Engine: ' + webError + ' — or use the simulation fallback below.'
      : phase === 'track'
        ? snapshot
          ? snapshot.message
          : 'Starting the live tracker...'
        : scan.message;

  return (
    <View style={styles.screen}>
      <PoseCameraWeb onPose={handlePose} onError={setWebError} outline={outline} style={StyleSheet.absoluteFill} />

      <FadeSlideIn style={styles.hud}>
        <View style={styles.hudInner}>
          <Text style={styles.title}>{phase === 'scan' ? 'SYSTEM SCAN: T-POSE' : 'LIVE TRACKING'}</Text>
          <Text style={[styles.status, phase === 'track' && textGlow(colors.blueLight)]}>{statusLine}</Text>

          {phase === 'scan' && (
            <View style={styles.barOuter}>
              <View style={[styles.barInner, { transform: [{ scaleX: Math.min(1, scan.progress) }] }]} />
            </View>
          )}

          {phase === 'track' && snapshot && (
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
          )}

          <Text style={styles.message}>{message}</Text>
          {webError && !sim && <Text style={styles.errorBanner}>{'> ' + webError}</Text>}
          {phase === 'scan' && scan.calibration && (
            <Text style={styles.locked}>{'> Body profile locked, Hunter.'}</Text>
          )}
        </View>
      </FadeSlideIn>

      <View style={styles.controls}>
        {phase === 'scan' && scan.ready && (
          <GlowPressable glowColor={colors.success} onPress={enterTracking} style={[styles.button, styles.wide]}>
            <Text style={[styles.buttonText, { color: colors.success }]}>ENTER LIVE TRACKING</Text>
          </GlowPressable>
        )}
        {phase === 'track' && (
          <GlowPressable glowColor={colors.danger} onPress={restartScan} style={[styles.button, styles.wide]}>
            <Text style={[styles.buttonText, { color: colors.danger }]}>END TRACKING</Text>
          </GlowPressable>
        )}

        {/* Simulation fallback (only while scanning) — the default is the real detector */}
        {phase === 'scan' && (
          <View style={styles.simRow}>
            <Text style={styles.simNote}>Camera trouble? Simulate: </Text>
            {['real', 'perfect', 'armsDown'].map((key) => (
              <Pressable
                key={key}
                style={[styles.chip, (key === 'real' ? sim === null : sim === key) && styles.chipActive]}
                onPress={() => {
                  setSim(key === 'real' ? null : key);
                  scan.reset();
                }}
              >
                <Text style={styles.chipText}>{key === 'real' ? 'REAL' : key === 'perfect' ? 'T-POSE' : 'ARMS DOWN'}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.row}>
          <GlowPressable glowColor={colors.mutedText} onPress={restartScan} style={styles.button}>
            <Text style={[styles.buttonText, { color: colors.mutedText }]}>RESTART</Text>
          </GlowPressable>
          <GlowPressable glowColor={colors.mutedText} onPress={onBack} style={styles.button}>
            <Text style={[styles.buttonText, { color: colors.mutedText }]}>BACK</Text>
          </GlowPressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  hud: { position: 'absolute', top: 0, left: 0, right: 0 },
  hudInner: { padding: spacing.md, paddingTop: 52, backgroundColor: colors.panelTransparent, borderBottomWidth: 1, borderBottomColor: '#12203a' },
  title: { color: '#ffffff', fontFamily: fonts.heading, fontSize: 13, fontWeight: 'bold', letterSpacing: 3 },
  status: { color: '#ffffff', fontFamily: fonts.display, fontSize: 22, fontWeight: 'bold', marginTop: 4 },
  barOuter: { height: 8, backgroundColor: '#0a1630', borderRadius: 4, marginVertical: spacing.sm, overflow: 'hidden' },
  barInner: { height: 8, width: '100%', backgroundColor: colors.blue, borderRadius: 4, transform: [{ scaleX: 0 }] },
  moveGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  moveRow: { flexDirection: 'row', alignItems: 'center', width: '48%' },
  moveLabel: { color: colors.mutedText, fontFamily: fonts.heading, fontSize: 10, width: 64 },
  moveActive: { color: colors.success, fontWeight: 'bold' },
  moveBarOuter: { flex: 1, height: 5, backgroundColor: '#0a1630', borderRadius: 3 },
  moveBarInner: { height: 5, backgroundColor: colors.blueLight, borderRadius: 3 },
  message: { color: colors.mutedText, fontFamily: fonts.body, fontSize: 12, marginTop: 6 },
  errorBanner: { color: colors.danger, fontFamily: fonts.heading, fontSize: 11, fontWeight: 'bold', marginTop: 4 },
  locked: { color: colors.success, fontFamily: fonts.heading, fontSize: 12, fontWeight: 'bold', marginTop: 4 },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: 28,
    backgroundColor: colors.panelTransparent,
    borderTopWidth: 1,
    borderTopColor: '#12203a',
  },
  button: { borderColor: '#12203a', borderWidth: 1, borderRadius: 8, backgroundColor: colors.panel, paddingVertical: 12, paddingHorizontal: 18, alignItems: 'center' },
  wide: { alignSelf: 'stretch' },
  buttonText: { fontFamily: fonts.heading, fontSize: 13, fontWeight: 'bold', letterSpacing: 1 },
  simRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  simNote: { color: colors.mutedText, fontFamily: fonts.body, fontSize: 11 },
  chip: { borderColor: colors.blue, borderWidth: 1, borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10 },
  chipActive: { backgroundColor: colors.blueDeep, borderColor: colors.blueLight },
  chipText: { color: colors.blueLight, fontFamily: fonts.heading, fontSize: 10 },
  row: { flexDirection: 'row', gap: spacing.sm },
});
